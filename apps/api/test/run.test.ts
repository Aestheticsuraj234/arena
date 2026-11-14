import {SEED_LANGUAGES} from '@arena/db';
import type {LanguageInfo, SubmissionView} from '@arena/shared';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import type {ErrorBody} from '../src/lib/errors';
import {createTestContext} from './helpers';

const ctx = createTestContext();
let cookie = '';

beforeAll(async () => {
  await ctx.seedLanguages();
  cookie = (await ctx.signUp()).cookie;
});

afterAll(async () => {
  await ctx.pool.end();
});

function run(body: unknown, headers: Record<string, string> = {Cookie: cookie}) {
  return ctx.app.request('/v1/run', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', ...headers},
    body: JSON.stringify(body),
  });
}

describe('language registry and seed data', () => {
  it('agree on every language ID', () => {
    const seeded = SEED_LANGUAGES.map((l) => l.id).sort((a, b) => a - b);
    expect(ctx.registry.list().map((r) => r.languageId)).toEqual(seeded);
  });
});

describe('GET /v1/languages', () => {
  it('lists the six runnable languages', async () => {
    const res = await ctx.app.request('/v1/languages');
    expect(res.status).toBe(200);
    const body = (await res.json()) as LanguageInfo[];
    expect(body.map((l) => l.slug).sort()).toEqual(
      ['c', 'cpp', 'java', 'javascript', 'python', 'typescript'].sort(),
    );
  });
});

describe('POST /v1/run', () => {
  it('needs a signed-in user', async () => {
    const res = await run({languageId: 71, sourceCode: 'print(1)'}, {});
    expect(res.status).toBe(401);
  });

  it('runs the code with default limits and maps ok to accepted', async () => {
    const res = await run({languageId: 71, sourceCode: 'print(1)', stdin: 'x'});
    expect(res.status).toBe(200);
    const body = (await res.json()) as SubmissionView;
    expect(body).toMatchObject({status: 'accepted', stdout: 'fake\n', exitCode: 0});
    expect(body.token).toMatch(/^[0-9a-f-]{36}$/);
    expect(ctx.executor.jobs.at(-1)).toMatchObject({
      languageId: 71,
      inputs: ['x'],
      limits: {timeLimitMs: 2000, memoryLimitKb: 262_144},
    });
  });

  it('returns compiler output on a compilation error', async () => {
    ctx.executor.result = {
      compile: {success: false, output: 'main.c:1: error', exitCode: 1, timeMs: 30},
      runs: [],
    };
    const body = (await (await run({languageId: 50, sourceCode: 'x'})).json()) as SubmissionView;
    expect(body).toMatchObject({status: 'compilation_error', compileOutput: 'main.c:1: error'});
  });

  it('rejects an unknown language with 422', async () => {
    const res = await run({languageId: 999, sourceCode: 'x'});
    expect(res.status).toBe(422);
    expect(((await res.json()) as ErrorBody).error.message).toMatch(/999 is not supported/);
  });

  it('rejects empty source and out-of-range limits', async () => {
    expect((await run({languageId: 71, sourceCode: ''})).status).toBe(422);
    expect((await run({languageId: 71, sourceCode: 'x', timeLimitMs: 60_000})).status).toBe(422);
  });

  it('answers 202 with the token when the verdict takes too long', async () => {
    ctx.queue.paused = true;
    try {
      const res = await run({languageId: 71, sourceCode: 'print(1)'});
      expect(res.status).toBe(202);
      expect(((await res.json()) as SubmissionView).status).toBe('in_queue');
    } finally {
      ctx.queue.paused = false;
    }
  });

  it('rejects a body that is not JSON', async () => {
    const res = await ctx.app.request('/v1/run', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Cookie: cookie},
      body: '{nope',
    });
    expect(res.status).toBe(422);
  });
});
