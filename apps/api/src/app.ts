import type {Database} from '@arena/db';
import type {LanguageRegistry} from '@arena/engine';
import type {SubmissionEvents, SubmissionQueue} from '@arena/queue';
import type {ApiMetrics, Logger, Registry} from '@arena/telemetry';
import {Hono} from 'hono';
import {cors} from 'hono/cors';

import type {AppEnv} from './app-env';
import type {Auth} from './auth';
import type {Env} from './env';
import {judge0Routes} from './judge0/routes';
import {AppError, type ErrorBody} from './lib/errors';
import type {RateLimiter} from './lib/rate-limiter';
import {observe} from './middleware/observe';
import {loadSession} from './middleware/session';
import {apiKeyRoutes} from './routes/api-keys';
import {healthRoutes} from './routes/health';
import {opsRoutes} from './routes/ops';
import {languageRoutes} from './routes/languages';
import {meRoutes} from './routes/me';
import {problemRoutes} from './routes/problems';
import {runRoutes} from './routes/run';
import {submissionRoutes} from './routes/submissions';
import {SubmissionService} from './services/submission-service';

export interface AppDeps {
  env: Env;
  db: Database;
  auth: Auth;
  registry: LanguageRegistry;
  queue: SubmissionQueue;
  rateLimiter: RateLimiter;
  events: SubmissionEvents;
  logger: Logger;
  metrics: {registry: Registry; api: ApiMetrics};
  /** Extra readiness checks (Redis…), keyed by name. */
  readiness?: Record<string, () => Promise<boolean>>;
}

/** Builds the HTTP app. Kept free of `listen()` so tests can call it directly. */
export function createApp(deps: AppDeps) {
  const {env, db, auth, registry, queue, rateLimiter, events, logger, metrics} = deps;
  const app = new Hono<AppEnv>();
  const submissions = new SubmissionService(db, registry, queue, metrics.api);

  app.use('*', observe(logger, metrics.api));

  app.use(
    '*',
    cors({
      origin: env.WEB_URL,
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization', 'X-Auth-Token'],
      exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));

  app.route('/health', healthRoutes(db));
  app.route(
    '/',
    opsRoutes({
      db,
      metrics: metrics.registry,
      token: env.METRICS_TOKEN,
      checks: deps.readiness ?? {},
    }),
  );

  app.use('/v1/*', loadSession(auth));
  app.route('/v1/me', meRoutes());
  app.route('/v1/languages', languageRoutes(db, registry));
  app.route('/v1/run', runRoutes(submissions, env.RUN_WAIT_MS));
  app.route('/v1/submissions', submissionRoutes(submissions, events));
  app.route('/v1/api-keys', apiKeyRoutes(db));
  app.route('/v1/problems', problemRoutes(submissions, env.RUN_WAIT_MS));

  // Judge0-compatible API at the root: /submissions, /languages, /statuses, /about.
  app.route(
    '/',
    judge0Routes({db, registry, service: submissions, rateLimiter, waitMs: env.RUN_WAIT_MS}),
  );

  app.notFound((c) => {
    const body: ErrorBody = {error: {code: 'not_found', message: 'Route not found'}};
    return c.json(body, 404);
  });

  app.onError((err, c) => {
    if (err instanceof AppError) {
      const body: ErrorBody = {error: {code: err.code, message: err.message}};
      return c.json(body, err.status);
    }
    c.get('log').error({err}, 'unhandled error');
    const body: ErrorBody = {error: {code: 'internal', message: 'Something went wrong'}};
    return c.json(body, 500);
  });

  return app;
}
