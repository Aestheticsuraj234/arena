import {randomUUID} from 'node:crypto';

import {createDb} from '@arena/db';
import type {HealthResponse, PublicUser} from '@arena/shared';
import {afterAll, describe, expect, it} from 'vitest';

import {createApp} from '../src/app';
import type {ErrorBody} from '../src/lib/errors';
import {createTestContext} from './helpers';

const {env, pool, auth, app, origin, registry, queue, rateLimiter, events, logger, metrics} =
  createTestContext();

afterAll(async () => {
  await pool.end();
});

function sessionCookie(res: Response): string {
  const cookie = res.headers.getSetCookie().find((c) => c.includes('session_token'));
  if (!cookie) throw new Error('No session cookie in response');
  return cookie.split(';')[0] ?? '';
}

describe('GET /health', () => {
  it('reports the database as up', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as HealthResponse;
    expect(body).toMatchObject({status: 'ok', checks: {database: 'ok'}});
  });

  it('returns 503 when the database is unreachable', async () => {
    const dead = createDb('postgres://postgres@127.0.0.1:1/none');
    const deadApp = createApp({
      env,
      db: dead.db,
      auth,
      registry,
      queue,
      rateLimiter,
      events,
      logger,
      metrics,
    });
    const res = await deadApp.request('/health');
    expect(res.status).toBe(503);
    const body = (await res.json()) as HealthResponse;
    expect(body).toMatchObject({status: 'degraded', checks: {database: 'down'}});
    await dead.pool.end();
  });
});

describe('auth flow', () => {
  const email = `user-${randomUUID()}@test.dev`;
  const password = 'password123';

  it('signs up and returns a session cookie', async () => {
    const res = await app.request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', ...origin},
      body: JSON.stringify({name: 'Test User', email, password}),
    });
    expect(res.status).toBe(200);
    expect(sessionCookie(res)).toContain('session_token=');
  });

  it('rejects a wrong password', async () => {
    const res = await app.request('/api/auth/sign-in/email', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', ...origin},
      body: JSON.stringify({email, password: 'wrong-password'}),
    });
    expect(res.status).toBe(401);
  });

  it('signs in and reads /v1/me with the cookie', async () => {
    const signIn = await app.request('/api/auth/sign-in/email', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', ...origin},
      body: JSON.stringify({email, password}),
    });
    expect(signIn.status).toBe(200);

    const me = await app.request('/v1/me', {headers: {Cookie: sessionCookie(signIn)}});
    expect(me.status).toBe(200);
    const user = (await me.json()) as PublicUser;
    expect(user).toMatchObject({email, name: 'Test User'});
  });

  it('returns 401 from /v1/me without a session', async () => {
    const res = await app.request('/v1/me');
    expect(res.status).toBe(401);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe('unauthorized');
  });
});

describe('unknown routes', () => {
  it('returns a JSON 404', async () => {
    const res = await app.request('/nope');
    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.code).toBe('not_found');
  });
});
