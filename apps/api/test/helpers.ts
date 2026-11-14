import {randomUUID} from 'node:crypto';

import {
  createDb,
  LanguageRepository,
  ProblemRepository,
  SEED_LANGUAGES,
  SEED_PROBLEMS,
  SubmissionRepository,
} from '@arena/db';
import {
  createDefaultRegistry,
  type ExecutionJob,
  type ExecutionResult,
  type Executor,
} from '@arena/engine';
import {MemorySubmissionEvents, SubmissionProcessor, type SubmissionQueue} from '@arena/queue';

import {createApiMetrics, createLogger, createRegistry} from '@arena/telemetry';

import {createApp} from '../src/app';
import {MemoryRateLimiter} from '../src/lib/rate-limiter';
import {createAuth} from '../src/auth';
import {loadEnv} from '../src/env';

/** Records jobs and answers with a canned result. */
export class FakeExecutor implements Executor {
  readonly jobs: ExecutionJob[] = [];
  result: ExecutionResult = {
    compile: null,
    runs: [
      {
        status: 'ok',
        stdout: 'fake\n',
        stderr: '',
        exitCode: 0,
        signal: null,
        timeMs: 5,
        memoryKb: 1000,
        message: null,
      },
    ],
  };

  /** When set, computes stdout per input instead of returning `result`. */
  solve: ((input: string) => string) | null = null;

  async execute(job: ExecutionJob): Promise<ExecutionResult> {
    this.jobs.push(job);
    const solve = this.solve;
    if (!solve) return this.result;
    const runs = [];
    for (const [i, input] of job.inputs.entries()) {
      const run = {
        status: 'ok' as const,
        stdout: solve(input),
        stderr: '',
        exitCode: 0,
        signal: null,
        timeMs: 10 + i,
        memoryKb: 2000 + i,
        message: null,
      };
      runs.push(run);
      if (job.afterRun?.(run, i) === 'stop') break;
    }
    return {compile: null, runs};
  }
}

/**
 * Runs submissions right away with the real `SubmissionProcessor`, so API tests
 * cover the full create → claim → execute → save path without Redis or Docker.
 * `paused` keeps jobs queued, to test the 202 path.
 */
export class InlineQueue implements SubmissionQueue {
  paused = false;
  readonly pending: string[] = [];

  constructor(private readonly processor: SubmissionProcessor) {}

  async enqueue(ids: readonly string[]): Promise<void> {
    if (this.paused) {
      this.pending.push(...ids);
      return;
    }
    for (const id of ids) await this.processor.process(id);
  }

  async waitUntilFinished(id: string): Promise<boolean> {
    return !this.pending.includes(id);
  }

  async depth(): Promise<number> {
    return this.pending.length;
  }

  async close(): Promise<void> {}
}

export function createTestContext() {
  const env = loadEnv({
    ...process.env,
    NODE_ENV: 'test',
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'test-secret-test-secret-test-secret-12',
  });
  const {db, pool} = createDb(env.DATABASE_URL);
  const auth = createAuth(env, db);
  const registry = createDefaultRegistry();
  const executor = new FakeExecutor();
  const events = new MemorySubmissionEvents();
  const processor = new SubmissionProcessor(
    new SubmissionRepository(db),
    new ProblemRepository(db),
    executor,
    {events},
  );
  const queue = new InlineQueue(processor);
  const rateLimiter = new MemoryRateLimiter(5);
  const logger = createLogger({service: 'api-test', level: 'silent'});
  const metricsRegistry = createRegistry('api');
  const metrics = {
    registry: metricsRegistry,
    api: createApiMetrics(metricsRegistry, () => queue.depth()),
  };
  const app = createApp({env, db, auth, registry, queue, rateLimiter, events, logger, metrics});
  const origin = {Origin: env.WEB_URL};

  /** Signs up a fresh user and returns its `Cookie` header value. */
  async function signUp(name = 'Test User'): Promise<{cookie: string; email: string}> {
    const email = `user-${randomUUID()}@test.dev`;
    const res = await app.request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', ...origin},
      body: JSON.stringify({name, email, password: 'password123'}),
    });
    const cookie = res.headers.getSetCookie().find((c) => c.includes('session_token'));
    if (!cookie) throw new Error(`Sign-up failed: ${res.status}`);
    return {cookie: cookie.split(';')[0] ?? '', email};
  }

  /** Creates an API key for the cookie's user through the API. */
  async function createApiKey(cookie: string): Promise<string> {
    const res = await app.request('/v1/api-keys', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Cookie: cookie},
      body: JSON.stringify({name: 'test'}),
    });
    const body = (await res.json()) as {key: string};
    return body.key;
  }

  async function seedLanguages() {
    await new LanguageRepository(db).upsertMany(SEED_LANGUAGES);
    const problems = new ProblemRepository(db);
    for (const problem of SEED_PROBLEMS) await problems.upsert(problem);
  }

  return {
    env,
    db,
    pool,
    auth,
    registry,
    executor,
    queue,
    rateLimiter,
    events,
    processor,
    logger,
    metrics,
    app,
    origin,
    signUp,
    seedLanguages,
    createApiKey,
  };
}
