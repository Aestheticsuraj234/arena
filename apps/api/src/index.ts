import {createDb} from '@arena/db';
import {createDefaultRegistry} from '@arena/engine';
import {BullSubmissionQueue, createRedis} from '@arena/queue';
import {serve} from '@hono/node-server';

import {createApp} from './app';
import {createAuth} from './auth';
import {loadEnv} from './env';

const env = loadEnv();
const {db, pool} = createDb(env.DATABASE_URL);
const auth = createAuth(env, db);
const registry = createDefaultRegistry();
const redis = createRedis(env.REDIS_URL);
const queue = new BullSubmissionQueue(redis);
const app = createApp({env, db, auth, registry, queue});

const server = serve({fetch: app.fetch, port: env.API_PORT}, (info) => {
  console.log(`Arena API listening on http://localhost:${info.port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close();
  await queue.close();
  await redis.quit();
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
