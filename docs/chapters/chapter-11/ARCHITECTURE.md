# Chapter 11: Architecture

Diagram and metric table: [observability](architecture/observability.md)

```
packages/telemetry/src/
├── logger.ts       createLogger({service}) → pino, ISO time, redaction
├── metrics.ts      createRegistry(), createApiMetrics(), createWorkerMetrics()
└── ops-server.ts   startOpsServer({port, registry, health})
apps/api/src/
├── middleware/observe.ts   request ID, access log, HTTP metrics
└── routes/ops.ts           /metrics, /ready
apps/worker/src/index.ts    hooks → metrics + logs; ops server
ops/
├── prometheus/prometheus.yml       production targets (api:4000, worker:9465)
├── prometheus/prometheus.dev.yml   host targets for `pnpm dev`
├── prometheus/alerts.yml           5 rules
└── grafana/                        provisioning + build-dashboard.mjs + dashboards/arena.json
docker-compose.observability.yml
```

## Alerts

| Alert                  | Fires when                                           |
| ---------------------- | ---------------------------------------------------- |
| ArenaWorkerDown        | a worker's `/metrics` is unreachable for 1 min       |
| ArenaQueueBacklog      | more than 50 queued for 5 min                        |
| ArenaApiErrors         | more than 5% 5xx for 5 min                           |
| ArenaExecutionFailures | any submission ended as internal error after retries |
| ArenaSlowExecutions    | p95 claim-to-verdict over 10 s for 10 min            |
