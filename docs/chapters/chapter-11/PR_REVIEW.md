# Chapter 11: Review

| #   | Finding                                                            | Fix                                                 |
| --- | ------------------------------------------------------------------ | --------------------------------------------------- |
| 1   | `routePath(c)` in middleware returns `*`                           | `routePath(c, -1)`, `unmatched` for 404s            |
| 2   | A Redis outage would fail the whole scrape                         | Queue depth reports −1                              |
| 3   | Metrics token compared with `===`                                  | `timingSafeEqual`                                   |
| 4   | Cookies and API keys could reach logs                              | pino `redact` on those headers; logs carry IDs only |
| 5   | Worker missing `@types/dockerode` once it imported Docker directly | Added                                               |
| 6   | Grafana stat colored "judged" red by default                       | Explicit thresholds per stat                        |
| 7   | Worker index rewritten after Prettier touched it                   | Re-read before writing                              |

Style: no `console.*`; telemetry types (`Logger`, `Registry`, `ApiMetrics`) are
injected, never imported as globals.
