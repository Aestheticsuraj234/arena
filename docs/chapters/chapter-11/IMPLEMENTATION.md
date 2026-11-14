# Chapter 11: Implementation notes

## Acceptance criteria

| #   | Criterion                                                                 | Result                                     |
| --- | ------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | Every request has an ID in the response header and the log line           | ✅                                         |
| 2   | Metrics use route patterns; tokens never appear in labels                 | ✅                                         |
| 3   | Prometheus scrapes API and worker; both targets `up`                      | ✅                                         |
| 4   | Verdict counts in Prometheus match what was sent                          | ✅ (6 accepted, 3 each of WA, TLE, RE, CE) |
| 5   | All 5 alert rules load and evaluate                                       | ✅                                         |
| 6   | Grafana provisions the datasource and dashboard; no panel shows "No data" | ✅                                         |
| 7   | `/ready` and worker `/health` return 503 when a dependency is down        | ✅                                         |
| 8   | No `console.*` left in API or worker                                      | ✅                                         |

## Decisions

- **One telemetry package** shared by API and worker, so metric names cannot drift.
- **Route patterns as labels** via Hono's `routePath(c, -1)`. Raw URLs would
  create one time series per token and blow up Prometheus.
- **Queue depth collected on scrape** (gauge `collect()`), reported as −1 if
  Redis is down instead of failing the whole scrape.
- **Worker metrics through processor hooks**, so the processor stays free of
  Prometheus and the API tests do not need it.
- **Dashboard generated from code** (`build-dashboard.mjs`), reviewable in a
  diff instead of a 1 000-line JSON export.
- **`/health` vs `/ready`.** Health is liveness (process up, DB reachable);
  ready adds Redis, for load balancers deciding where to send traffic.

## What the dashboard showed

With about 100 verdicts per minute on one worker (concurrency 2), p95 claim to
verdict was about 1 s for Python and JavaScript and about 2 s for C++ and Java,
where compiling dominates.
