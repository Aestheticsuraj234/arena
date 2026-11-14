# Chapter 12: Implementation notes

## Acceptance criteria

| #   | Criterion                                                                      | Result   |
| --- | ------------------------------------------------------------------------------ | -------- |
| 1   | All three images build from one Dockerfile                                     | ✅       |
| 2   | `docker compose up` starts in order; `setup-db` migrates and seeds, then exits | ✅       |
| 3   | API and worker report healthy; `/metrics` is not reachable through Caddy       | ✅       |
| 4   | The full browser flow passes through Caddy on two hostnames                    | ✅ 19/19 |
| 5   | Live test progress (SSE) works through the proxy                               | ✅       |
| 6   | Prometheus scrapes both services inside the stack; Grafana is healthy          | ✅       |
| 7   | 200 mixed-language submissions under load: all accepted, no errors             | ✅       |

## Load test results (2 vCPU host, `WORKER_CONCURRENCY=4`)

| Run                         | Throughput | p50    | p95     | Verdicts     |
| --------------------------- | ---------- | ------ | ------- | ------------ |
| 200 submissions, 20 clients | 2.16 /s    | 9.10 s | 10.81 s | 200 Accepted |
| 40 submissions, 4 clients   | 2.07 /s    | 1.78 s | 3.31 s  | 40 Accepted  |

With 4 clients (no queueing), end-to-end time per language: JavaScript 1.05 s,
Python 1.17 s, C++ 2.54 s, Java 2.85 s (p50). With 20 clients the extra time
is waiting in the queue: about 2 submissions per second is the ceiling of 2
CPUs, since each sandbox gets one CPU. Throughput scales with CPUs and workers.

## Decisions

- **Two hostnames.** Judge0's `/submissions` clashes with the web page
  `/submissions`; separate hosts plus `COOKIE_DOMAIN` keep both intact.
- **`setup-db` as its own service** using the API image, so migrations run
  before any new API or worker starts.
- **`autoInstallPeers: false`.** Better Auth's optional peers (Next.js,
  drizzle-kit) were landing in the API image: 1.28 GB → 530 MB.
- **Grafana on 127.0.0.1 only**, reached through an SSH tunnel.
- **Worker runs as root with the Docker socket**, documented as the main
  security trade-off, with a dedicated host or rootless Docker recommended.

## Bugs found by running the real stack

- Compose passes unset variables as `""`, and `METRICS_TOKEN=""` failed
  validation, so the API crash-looped. Empty optional variables now count as unset.
- Disabling auto-installed peers surfaced a hidden dependency: Vitest needs `vite`.
