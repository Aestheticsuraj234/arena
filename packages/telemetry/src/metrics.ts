import {Counter, Gauge, Histogram, Registry, collectDefaultMetrics} from 'prom-client';

/** A registry with Node.js process metrics, prefixed `arena_<service>_`. */
export function createRegistry(service: string): Registry {
  const registry = new Registry();
  registry.setDefaultLabels({service});
  collectDefaultMetrics({register: registry, prefix: 'arena_'});
  return registry;
}

/** Metrics the API records. */
export function createApiMetrics(registry: Registry, queueDepth: () => Promise<number>) {
  return {
    httpRequests: new Counter({
      name: 'arena_http_requests_total',
      help: 'HTTP requests by method, route and status',
      labelNames: ['method', 'route', 'status'] as const,
      registers: [registry],
    }),
    httpDuration: new Histogram({
      name: 'arena_http_request_duration_seconds',
      help: 'HTTP request duration',
      labelNames: ['method', 'route'] as const,
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
      registers: [registry],
    }),
    submissionsCreated: new Counter({
      name: 'arena_submissions_created_total',
      help: 'Submissions created, by language and source (web, judge0, problem)',
      labelNames: ['language', 'source'] as const,
      registers: [registry],
    }),
    queueDepth: new Gauge({
      name: 'arena_queue_depth',
      help: 'Submissions waiting or running',
      registers: [registry],
      async collect() {
        this.set(await queueDepth().catch(() => -1));
      },
    }),
  };
}

export type ApiMetrics = ReturnType<typeof createApiMetrics>;

/** Metrics the worker records. */
export function createWorkerMetrics(registry: Registry) {
  return {
    processed: new Counter({
      name: 'arena_submissions_processed_total',
      help: 'Finished submissions by language and verdict',
      labelNames: ['language', 'status'] as const,
      registers: [registry],
    }),
    executionDuration: new Histogram({
      name: 'arena_execution_duration_seconds',
      help: 'Time from claim to verdict, including container start and compile',
      labelNames: ['language'] as const,
      buckets: [0.1, 0.25, 0.5, 1, 2, 3, 5, 10, 20, 40],
      registers: [registry],
    }),
    active: new Gauge({
      name: 'arena_active_executions',
      help: 'Submissions running right now in this worker',
      registers: [registry],
    }),
    failures: new Counter({
      name: 'arena_execution_failures_total',
      help: 'Infrastructure failures (retried or given up)',
      labelNames: ['final'] as const,
      registers: [registry],
    }),
  };
}

export type WorkerMetrics = ReturnType<typeof createWorkerMetrics>;
