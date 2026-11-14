import {createDb} from '@arena/db';
import {createDefaultRegistry, DockerExecutor} from '@arena/engine';
import {serve} from '@hono/node-server';

import {createApp} from './app';
import {createAuth} from './auth';
import {loadEnv} from './env';

const env = loadEnv();
const {db, pool} = createDb(env.DATABASE_URL);
const auth = createAuth(env, db);
const registry = createDefaultRegistry();
const executor = new DockerExecutor(registry);
const app = createApp({env, db, auth, registry, executor});

const missing = await executor.missingImages().catch(() => registry.images());
if (missing.length > 0) {
  console.warn(`Missing runtime images: ${missing.join(', ')}. Run pnpm images:build.`);
}

const server = serve({fetch: app.fetch, port: env.API_PORT}, (info) => {
  console.log(`Arena API listening on http://localhost:${info.port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close();
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
