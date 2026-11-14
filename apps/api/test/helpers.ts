import {randomUUID} from 'node:crypto';

import {createDb, LanguageRepository, SEED_LANGUAGES} from '@arena/db';
import {
  createDefaultRegistry,
  type ExecutionJob,
  type ExecutionResult,
  type Executor,
} from '@arena/engine';

import {createApp} from '../src/app';
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

  async execute(job: ExecutionJob): Promise<ExecutionResult> {
    this.jobs.push(job);
    return this.result;
  }
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
  const app = createApp({env, db, auth, registry, executor});
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

  async function seedLanguages() {
    await new LanguageRepository(db).upsertMany(SEED_LANGUAGES);
  }

  return {env, db, pool, auth, registry, executor, app, origin, signUp, seedLanguages};
}
