# Chapter 11: Rebuild prompt

Create `packages/telemetry` with pino and prom-client: `createLogger({service})`
(JSON, ISO time, redact cookie/authorization/x-auth-token), `createRegistry(service)`
with default metrics prefixed `arena_`, `createApiMetrics(registry, queueDepth)`
(http requests counter and duration histogram by method/route/status,
submissions created by language/source, queue depth gauge collected on scrape,
−1 on error), `createWorkerMetrics(registry)` (processed by language/status,
duration histogram by language, active gauge, failures by final), and
`startOpsServer({port, registry, health})` serving `/metrics` and `/health`.

API: inject `logger` and `metrics`; `observe()` middleware sets/echoes
`X-Request-Id`, logs one line per request and records metrics labelled by
`routePath(c, -1)`; `GET /metrics` (bearer `METRICS_TOKEN` if set,
`timingSafeEqual`) and `GET /ready` (database + injected checks such as Redis).
Count created submissions with a `source`. Replace `console.*`.

Worker: processor `hooks` (onStart, onFinish with status and duration,
onError) and `onGiveUp`; wire them to metrics and logs; ops server on
`WORKER_METRICS_PORT` (9465) with Redis and Docker health.

Add `ops/prometheus` (prod and dev configs, 5 alert rules), Grafana
provisioning, a dashboard generator script, and `docker-compose.observability.yml`.
