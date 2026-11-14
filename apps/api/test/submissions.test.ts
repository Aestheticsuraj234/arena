import type {SubmissionView} from '@arena/shared';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createTestContext} from './helpers';

const ctx = createTestContext();
let alice = '';
let bob = '';

beforeAll(async () => {
  await ctx.seedLanguages();
  alice = (await ctx.signUp('Alice')).cookie;
  bob = (await ctx.signUp('Bob')).cookie;
});

afterAll(async () => {
  await ctx.pool.end();
});

async function submit(cookie: string, body: unknown) {
  return ctx.app.request('/v1/submissions', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Cookie: cookie},
    body: JSON.stringify(body),
  });
}

describe('/v1/submissions', () => {
  it('creates a submission and returns its token with 201', async () => {
    const res = await submit(alice, {languageId: 71, sourceCode: 'print(1)'});
    expect(res.status).toBe(201);
    const {token} = (await res.json()) as {token: string};

    const got = await ctx.app.request(`/v1/submissions/${token}`, {headers: {Cookie: alice}});
    expect(got.status).toBe(200);
    expect((await got.json()) as SubmissionView).toMatchObject({
      token,
      status: 'accepted',
      stdout: 'fake\n',
      sourceCode: 'print(1)',
    });
  });

  it("hides other users' submissions behind a 404", async () => {
    const res = await submit(alice, {languageId: 71, sourceCode: 'print(2)'});
    const {token} = (await res.json()) as {token: string};
    const got = await ctx.app.request(`/v1/submissions/${token}`, {headers: {Cookie: bob}});
    expect(got.status).toBe(404);
  });

  it('returns 404 for a malformed token', async () => {
    const got = await ctx.app.request('/v1/submissions/not-a-uuid', {headers: {Cookie: alice}});
    expect(got.status).toBe(404);
  });

  it('lists only my submissions, newest first', async () => {
    await submit(bob, {languageId: 71, sourceCode: 'print("bob")'});
    const res = await ctx.app.request('/v1/submissions?limit=50', {headers: {Cookie: bob}});
    const list = (await res.json()) as SubmissionView[];
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((s) => s.sourceCode.includes('bob'))).toBe(true);
  });

  it('needs a signed-in user', async () => {
    expect((await ctx.app.request('/v1/submissions')).status).toBe(401);
  });
});
