import {ApiKeyRepository, type ApiKey, type Database} from '@arena/db';
import {Hono} from 'hono';
import {z} from 'zod';

import type {AppEnv} from '../app-env';
import {NotFoundError, UnauthorizedError} from '../lib/errors';
import {parseBody} from '../lib/validate';
import {requireUser} from '../middleware/session';

const createKeySchema = z.object({name: z.string().trim().min(1).max(60)});

function view(k: ApiKey) {
  return {
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    createdAt: k.createdAt.toISOString(),
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
  };
}

/** Signed-in users manage their API keys. The full key is returned once. */
export function apiKeyRoutes(db: Database) {
  const keys = new ApiKeyRepository(db);
  return new Hono<AppEnv>()
    .use(requireUser)
    .get('/', async (c) => {
      const user = c.get('user');
      if (!user) throw new UnauthorizedError();
      return c.json((await keys.listByUser(user.id)).map(view));
    })
    .post('/', async (c) => {
      const user = c.get('user');
      if (!user) throw new UnauthorizedError();
      const {name} = await parseBody(c, createKeySchema);
      const {key, apiKey} = await keys.create(user.id, name);
      return c.json({...view(apiKey), key}, 201);
    })
    .delete('/:id', async (c) => {
      const user = c.get('user');
      const id = z.uuid().safeParse(c.req.param('id'));
      if (!user || !id.success || !(await keys.revoke(id.data, user.id))) {
        throw new NotFoundError('API key not found');
      }
      return c.body(null, 204);
    });
}
