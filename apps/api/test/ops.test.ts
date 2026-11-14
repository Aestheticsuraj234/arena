import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createApp} from '../src/app';
import {createTestContext} from './helpers';

const ctx = createTestContext();
let cookie = '';

beforeAll(async () => {
  await ctx.seedLanguages();
  cookie = (await ctx.signUp('Ops')).cookie;
});

afterAll(async () => {
  await ctx.pool.end();
});

describe('observability', () => {
  it('echoes a valid X-Request-Id and makes one up otherwise', async () => {
    const mine = await ctx.app.request('/health', {headers: {'X-Request-Id': 'trace-12345678'}});
    expect(mine.headers.get('X-Request-Id')).toBe('trace-12345678');
    const bad = await ctx.app.request('/health', {headers: {'X-Request-Id': 'x'}});
    expect(bad.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('labels HTTP metrics by route pattern, not by URL', async () => {
    await ctx.app.request('/v1/submissions/00000000-0000-4000-8000-000000000001', {
      headers: {Cookie: cookie},
    });
    await ctx.app.request('/no/such/route');
    const text = await (await ctx.app.request('/metrics')).text();
    expect(text).toMatch(
      /arena_http_requests_total\{method="GET",route="\/v1\/submissions\/:token",status="404"/,
    );
    expect(text).toMatch(/route="unmatched",status="404"/);
    expect(text).not.toContain('00000000-0000-4000-8000-000000000001');
  });

  it('counts created submissions by language and source', async () => {
    await ctx.app.request('/v1/run', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Cookie: cookie},
      body: JSON.stringify({languageId: 54, sourceCode: 'int main(){}'}),
    });
    const text = await (await ctx.app.request('/metrics')).text();
    expect(text).toMatch(
      /arena_submissions_created_total\{language="cpp",source="web",service="api"\} \d+/,
    );
    expect(text).toMatch(/arena_queue_depth\{service="api"\} 0/);
  });

  it('protects /metrics with a bearer token when configured', async () => {
    const app = createApp({
      ...ctx,
      env: {...ctx.env, METRICS_TOKEN: 'metrics-token-1234567890'},
    });
    expect((await app.request('/metrics')).status).toBe(401);
    expect(
      (await app.request('/metrics', {headers: {Authorization: 'Bearer wrong-token-1234567890'}}))
        .status,
    ).toBe(401);
    expect(
      (await app.request('/metrics', {headers: {Authorization: 'Bearer metrics-token-1234567890'}}))
        .status,
    ).toBe(200);
  });

  it('/ready reports each check and 503 when one fails', async () => {
    const ok = await ctx.app.request('/ready');
    expect(ok.status).toBe(200);
    const app = createApp({...ctx, readiness: {redis: async () => false}});
    const res = await app.request('/ready');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({status: 'not_ready', checks: {database: true, redis: false}});
  });
});
