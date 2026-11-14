import {createDb, ProblemRepository, SubmissionRepository} from '@arena/db';
import {createDefaultRegistry, DockerExecutor} from '@arena/engine';
import {
  createRedis,
  createSubmissionWorker,
  RedisSubmissionEvents,
  SubmissionProcessor,
} from '@arena/queue';

import {loadWorkerEnv} from './env';

const env = loadWorkerEnv();
const {db, pool} = createDb(env.DATABASE_URL);
const registry = createDefaultRegistry();
const executor = new DockerExecutor(registry);

const missing = await executor.missingImages();
if (missing.length > 0) {
  console.error(`Missing runtime images: ${missing.join(', ')}. Run pnpm images:build.`);
  process.exit(1);
}

const connection = createRedis(env.REDIS_URL);
const publisher = createRedis(env.REDIS_URL);
const events = new RedisSubmissionEvents(publisher);
const worker = createSubmissionWorker({
  connection,
  processor: new SubmissionProcessor(
    new SubmissionRepository(db),
    new ProblemRepository(db),
    executor,
    {
      events,
    },
  ),
  concurrency: env.WORKER_CONCURRENCY,
  log: (message) => console.log(message),
});
await worker.waitUntilReady();
console.log(`Arena worker ready (concurrency ${env.WORKER_CONCURRENCY})`);

async function shutdown(signal: string) {
  console.log(`${signal} received: finishing running submissions`);
  await worker.close(); // waits for active jobs
  await connection.quit();
  await publisher.quit();
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
