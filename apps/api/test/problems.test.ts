import type {ProblemDetail, ProblemSummary, SubmissionView} from '@arena/shared';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';

import {createTestContext} from './helpers';

const ctx = createTestContext();
let cookie = '';

/** A correct "sum of two" solution. */
const sum = (input: string) => {
  const [a = 0, b = 0] = input.trim().split(/\s+/).map(Number);
  return `${a + b}\n`;
};

beforeAll(async () => {
  await ctx.seedLanguages();
  cookie = (await ctx.signUp('Solver')).cookie;
});

beforeEach(() => {
  ctx.executor.solve = sum;
});

afterAll(async () => {
  await ctx.pool.end();
});

async function submit(mode: 'run' | 'submit', slug = 'sum-of-two') {
  const res = await ctx.app.request(`/v1/problems/${slug}/submit`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Cookie: cookie},
    body: JSON.stringify({languageId: 71, sourceCode: 'solution', mode}),
  });
  return {status: res.status, body: (await res.json()) as SubmissionView};
}

describe('GET /v1/problems', () => {
  it('lists the seeded problems', async () => {
    const list = (await (await ctx.app.request('/v1/problems')).json()) as ProblemSummary[];
    expect(list.map((p) => p.slug)).toEqual(
      expect.arrayContaining(['sum-of-two', 'reverse-string', 'fizzbuzz']),
    );
  });

  it('shows samples but never hidden tests', async () => {
    const p = (await (await ctx.app.request('/v1/problems/sum-of-two')).json()) as ProblemDetail;
    expect(p.samples).toEqual([
      {input: '2 3\n', expectedOutput: '5\n'},
      {input: '-4 10\n', expectedOutput: '6\n'},
    ]);
    expect(p.totalTests).toBe(4);
    expect(JSON.stringify(p)).not.toContain('1000000000');
  });

  it('404s for an unknown problem', async () => {
    expect((await ctx.app.request('/v1/problems/nope')).status).toBe(404);
  });
});

describe('POST /v1/problems/:slug/submit', () => {
  it('accepts a correct solution against all tests', async () => {
    const {status, body} = await submit('submit');
    expect(status).toBe(200);
    expect(body).toMatchObject({
      status: 'accepted',
      problemSlug: 'sum-of-two',
      testsPassed: 4,
      testsTotal: 4,
      message: 'Passed all 4 test cases',
      timeMs: 13,
    });
    expect(body.tests?.map((t) => t.status)).toEqual([
      'accepted',
      'accepted',
      'accepted',
      'accepted',
    ]);
  });

  it('"run" checks the samples only, and shows their data', async () => {
    const {body} = await submit('run');
    expect(body).toMatchObject({testsPassed: 2, testsTotal: 2});
    expect(body.tests?.[0]?.sample).toEqual({input: '2 3\n', expectedOutput: '5\n', stdout: '5\n'});
  });

  it('stops at the first failing test and names it', async () => {
    ctx.executor.solve = (input) => (input.startsWith('1000000000') ? '-1\n' : sum(input));
    const {body} = await submit('submit');
    expect(body).toMatchObject({
      status: 'wrong_answer',
      testsPassed: 2,
      testsTotal: 4,
      message: 'Wrong answer on test 3',
    });
    expect(body.tests).toHaveLength(3); // test 4 never ran
  });

  it('hides the output and data of a failed hidden test', async () => {
    ctx.executor.solve = (input) => (input.startsWith('1000000000') ? 'SECRET\n' : sum(input));
    const {body} = await submit('submit');
    expect(body.tests?.[2]?.sample).toBeNull();
    expect(body.stdout).toBeNull();
    expect(JSON.stringify(body)).not.toContain('SECRET');
  });

  it('uses the problem limits, not the defaults', async () => {
    await submit('submit');
    expect(ctx.executor.jobs.at(-1)?.limits).toMatchObject({
      timeLimitMs: 2000,
      memoryLimitKb: 262_144,
    });
  });

  it('includes the test results in GET /v1/submissions/:token', async () => {
    const {body} = await submit('submit');
    const res = await ctx.app.request(`/v1/submissions/${body.token}`, {headers: {Cookie: cookie}});
    expect(((await res.json()) as SubmissionView).tests).toHaveLength(4);
  });

  it('answers 202 with the token at once with ?wait=false', async () => {
    ctx.queue.paused = true;
    try {
      const res = await ctx.app.request('/v1/problems/sum-of-two/submit?wait=false', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Cookie: cookie},
        body: JSON.stringify({languageId: 71, sourceCode: 'x'}),
      });
      expect(res.status).toBe(202);
      expect(((await res.json()) as SubmissionView).status).toBe('in_queue');
    } finally {
      ctx.queue.paused = false;
      ctx.queue.pending.length = 0;
    }
  });

  it('needs a signed-in user', async () => {
    const res = await ctx.app.request('/v1/problems/sum-of-two/submit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({languageId: 71, sourceCode: 'x'}),
    });
    expect(res.status).toBe(401);
  });
});
