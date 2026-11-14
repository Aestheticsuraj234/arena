/** BullMQ queue + worker against real Redis and Postgres, with a fake executor. */
import {createDb, LanguageRepository, SEED_LANGUAGES, SubmissionRepository} from '@arena/db';
import type {ExecutionJob, ExecutionResult, Executor} from '@arena/engine';
import type {Worker} from 'bullmq';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {
  BullSubmissionQueue,
  createRedis,
  createSubmissionWorker,
  SubmissionProcessor,
} from '../src';

const OK: ExecutionResult = {
  compile: null,
  runs: [
    {
      status: 'ok',
      stdout: 'hi\n',
      stderr: '',
      exitCode: 0,
      signal: null,
      timeMs: 3,
      memoryKb: 100,
      message: null,
    },
  ],
};

/** Fails the first `failures` calls, sleeps `delayMs`, tracks concurrency. */
class ScriptedExecutor implements Executor {
  calls = 0;
  running = 0;
  maxRunning = 0;
  constructor(
    private failures = 0,
    private readonly delayMs = 0,
  ) {}

  async execute(_job: ExecutionJob): Promise<ExecutionResult> {
    this.calls++;
    this.running++;
    this.maxRunning = Math.max(this.maxRunning, this.running);
    try {
      await new Promise((r) => setTimeout(r, this.delayMs));
      if (this.failures > 0) {
        this.failures--;
        throw new Error('docker unavailable');
      }
      return OK;
    } finally {
      this.running--;
    }
  }
}

// A separate Redis database, because the test flushes it.
const redisUrl = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/15';
const {db, pool} = createDb(
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/arena',
);
const submissions = new SubmissionRepository(db);
const redis = createRedis(redisUrl);
const queue = new BullSubmissionQueue(redis);
let worker: Worker | undefined;

async function startWorker(executor: Executor, concurrency = 2) {
  await worker?.close();
  worker = createSubmissionWorker({
    connection: createRedis(redisUrl),
    processor: new SubmissionProcessor(submissions, executor),
    concurrency,
  });
  await worker.waitUntilReady();
}

async function newSubmission() {
  return submissions.create({
    languageId: 71,
    sourceCode: 'print("hi")',
    timeLimitMs: 1000,
    memoryLimitKb: 65_536,
  });
}

beforeAll(async () => {
  await new LanguageRepository(db).upsertMany(SEED_LANGUAGES);
  await redis.flushdb();
});

afterAll(async () => {
  await worker?.close();
  await queue.close();
  await redis.quit();
  await pool.end();
});

describe('submission queue', () => {
  it('runs an enqueued submission and stores the verdict', async () => {
    await startWorker(new ScriptedExecutor());
    const s = await newSubmission();
    await queue.enqueue([s.id]);
    expect(await queue.waitUntilFinished(s.id, 10_000)).toBe(true);
    expect(await submissions.findById(s.id)).toMatchObject({
      status: 'accepted',
      stdout: 'hi\n',
      timeMs: 3,
    });
  });

  it('enqueueing the same submission twice runs it once', async () => {
    const executor = new ScriptedExecutor(0, 200);
    await startWorker(executor);
    const s = await newSubmission();
    await queue.enqueue([s.id]);
    await queue.enqueue([s.id]);
    await queue.waitUntilFinished(s.id, 10_000);
    expect(executor.calls).toBe(1);
  });

  it('retries after an infrastructure failure', async () => {
    const executor = new ScriptedExecutor(1);
    await startWorker(executor);
    const s = await newSubmission();
    await queue.enqueue([s.id]);
    await queue.waitUntilFinished(s.id, 10_000);
    // waitUntilFinished resolves on the first failure; wait for the retry.
    await expect
      .poll(async () => (await submissions.findById(s.id))?.status, {timeout: 10_000})
      .toBe('accepted');
    expect(executor.calls).toBe(2);
  });

  it('marks internal_error after the last attempt fails', async () => {
    await startWorker(new ScriptedExecutor(10));
    const s = await newSubmission();
    await queue.enqueue([s.id]);
    await expect
      .poll(async () => (await submissions.findById(s.id))?.status, {timeout: 20_000})
      .toBe('internal_error');
    expect((await submissions.findById(s.id))?.message).toMatch(/docker unavailable/);
  });

  it('respects worker concurrency', async () => {
    const executor = new ScriptedExecutor(0, 300);
    await startWorker(executor, 3);
    const batch = await Promise.all(Array.from({length: 6}, () => newSubmission()));
    await queue.enqueue(batch.map((s) => s.id));
    await Promise.all(batch.map((s) => queue.waitUntilFinished(s.id, 10_000)));
    expect(executor.maxRunning).toBe(3);
  });

  it('reports queue depth', async () => {
    await worker?.close();
    worker = undefined;
    const s = await newSubmission();
    await queue.enqueue([s.id]);
    expect(await queue.depth()).toBeGreaterThanOrEqual(1);
    await startWorker(new ScriptedExecutor());
    await queue.waitUntilFinished(s.id, 10_000);
  });
});
