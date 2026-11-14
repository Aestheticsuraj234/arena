import {ApiKeyRepository, type Database} from '@arena/db';
import {createMiddleware} from 'hono/factory';

import type {AppEnv} from '../app-env';
import {UnauthorizedError} from '../lib/errors';

/** Key from `X-Auth-Token` (Judge0) or `Authorization: Bearer`. */
function readKey(header: (name: string) => string | undefined): string | null {
  const token = header('x-auth-token');
  if (token) return token.trim();
  const auth = header('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return null;
}

/** Requires a valid, unrevoked API key and puts it on the context. */
export function requireApiKey(db: Database) {
  const keys = new ApiKeyRepository(db);
  return createMiddleware<AppEnv>(async (c, next) => {
    const key = readKey((name) => c.req.header(name));
    if (!key) throw new UnauthorizedError('Send an API key in the X-Auth-Token header');
    const apiKey = await keys.verify(key);
    if (!apiKey) throw new UnauthorizedError('Invalid or revoked API key');
    c.set('apiKey', apiKey);
    void keys.touch(apiKey.id).catch(() => undefined);
    await next();
  });
}
