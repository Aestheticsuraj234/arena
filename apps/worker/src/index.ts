import {createDb, ProblemRepository, SubmissionRepository} from '@arena/db';
import {createDefaultRegistry, DockerExecutor} from '@arena/engine';
import {
  createRedis,
  createSubmissionWorker,
  RedisSubmissionEvents,
  SubmissionProcessor,
} from '@arena/queue';
import {createLogger, createRegistry, createWorkerMetrics, startOpsServer} from '@arena/telemetry';
import Docker from 'dockerode';

import {loadWorkerEnv} from './env';

const env = loadWorkerEnv();
const logger = createLogger({service: 'worker'});
const {db, pool} = createDb(env.DATABASE_URL);
const registry = createDefaultRegistry();
const docker = new Docker();
const executor = new DockerExecutor(registry, {docker});

const missing = await executor.missingImages();
if (missing.length > 0) {
  logger.fatal({missing}, 'Missing runtime images. Run pnpm images:build.');
  process.exit(1);
}

const metricsRegistry = createRegistry('worker');
const metrics = createWorkerMetrics(metricsRegistry);
const slug = (languageId: number) =>
  registry.has(languageId) ? registry.get(languageId).slug : 'unknown';

const connection = createRedis(env.REDIS_URL);
const publisher = createRedis(env.REDIS_URL);
const events = new RedisSubmissionEvents(publisher);
const processor = new SubmissionProcessor(
  new SubmissionRepository(db),
  new ProblemRepository(db),
  executor,
  {
    events,
    hooks: {
      onStart: () => metrics.active.inc(),
      onFinish: ({submissionId, languageId, status, durationMs}) => {
        metrics.active.dec();
        metrics.processed.inc({language: slug(languageId), status});
        metrics.executionDuration.observe({language: slug(languageId)}, durationMs / 1000);
        logger.info(
          {submissionId, language: slug(languageId), status, ms: Math.round(durationMs)},
          'judged',
        );
      },
      onError: ({submissionId, error}) => {
        metrics.active.dec();
        metrics.failures.inc({final: 'false'});
        logger.warn({submissionId, err: error}, 'execution failed, will retry');
      },
    },
  },
);

const worker = createSubmissionWorker({
  connection,
  processor,
  concurrency: env.WORKER_CONCURRENCY,
  onGiveUp: (submissionId) => {
    metrics.failures.inc({final: 'true'});
    logger.error({submissionId}, 'giving up after the last attempt');
  },
});
await worker.waitUntilReady();

const ops = await startOpsServer({
  port: env.WORKER_METRICS_PORT,
  registry: metricsRegistry,
  health: async () => ({
    redis: await connection.ping().then(
      (r) => r === 'PONG',
      () => false,
    ),
    docker: await docker.ping().then(
      () => true,
      () => false,
    ),
  }),
});
logger.info(
  {concurrency: env.WORKER_CONCURRENCY, metricsPort: env.WORKER_METRICS_PORT},
  'Arena worker ready',
);

async function shutdown(signal: string) {
  logger.info({signal}, 'finishing running submissions');
  ops.close();
  await worker.close(); // waits for active jobs
  await connection.quit();
  await publisher.quit();
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
