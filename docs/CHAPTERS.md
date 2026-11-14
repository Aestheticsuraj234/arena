# Arena: chapters

> Working name. Rename anytime.

Arena is a self-hosted remote code execution engine you run locally: send
code, it runs in an isolated Docker container and returns the output,
verdict, time and memory. It has a Judge0-compatible API, batch test cases
like LeetCode, and a Monaco playground on the web (Next.js). Reference:
[CodeBox](https://github.com/hiteshchoudhary/Codebox) (MIT).

12 chapters, one feature each, plus one bonus. All TypeScript. One tool per
job: Hono for the API, Drizzle + Postgres for data, Redis + BullMQ for the
queue (and Redis pub/sub for live results), dockerode for containers, zod for
validation, Monaco for the editor, Prometheus + Grafana for metrics, Caddy
for HTTPS.

| #   | Chapter                                  | What it adds                                                                                                                        | Status   |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Project init and authentication setup    | Turborepo + pnpm monorepo (`apps/api`, `apps/web`, `packages/*`), Hono API, Better Auth on web, design system, CI                   | ✅ Done  |
| 2   | Database and ORM layer setup             | Drizzle ORM, schema (users, api_keys, languages, submissions, batches, problems, test_cases), migrations, Repository pattern, seed  | ✅ Done  |
| 3   | Language runtime images                  | Multi-arch (amd64 + arm64) Docker images for C, C++, Java, JavaScript, TypeScript, Python; `LanguageRunner` (Strategy) + registry   | ✅ Done  |
| 4   | The executor: running code once          | `Executor` interface + `DockerExecutor` (dockerode): compile, run, stdin/stdout/stderr, exit codes, time and memory; sync `/run`    | ✅ Done  |
| 5   | Sandbox hardening                        | CPU, memory, timeout, `--network none`, read-only FS, non-root user, pids limit, output cap; tests that attack the runner           | ✅ Done  |
| 6   | Job queue and workers                    | BullMQ queue, new `apps/worker` app, job lifecycle state machine (queued → running → done / failed / timeout), concurrency, retries | ✅ Done  |
| 7   | Judge0-compatible submissions API        | `POST /submissions`, `GET /submissions/:token`, `wait=true`, status IDs, base64 fields, API keys, rate limiting                     | ✅ Done  |
| 8   | Batch submissions and verdicts           | Up to 20 runs per batch, test cases, output checker, verdicts (Accepted, Wrong Answer, TLE, MLE, Runtime Error, Compile Error)      | ⏸ Next   |
| 9   | Real-time results                        | Live run status over Server-Sent Events, fed by Redis pub/sub from the workers                                                      | Planned  |
| 10  | Monaco playground and problems UI        | Web editor with language picker, run with custom input, submit against test cases, results panel, submission history                | Planned  |
| 11  | Observability                            | Structured logs (pino), health checks, Prometheus metrics (queue depth, run time, verdicts), Grafana dashboard                      | Planned  |
| 12  | Deployment, load testing and final setup | Production Docker Compose, Caddy HTTPS, setup script, load test, final README so anyone can run it locally or on a VPS              | Planned  |
| ★   | Bonus: Firecracker executor              | `FirecrackerExecutor` behind the same `Executor` interface, with automatic fallback to Docker                                       | Optional |

## Every chapter ships with

- Plan and acceptance criteria, then code, tests, lint, typecheck and build
- A review against the Google TypeScript Style Guide
- Diagrams in `docs/chapters/chapter-XX/architecture/`
- Docs: README, IMPLEMENTATION, ARCHITECTURE, TESTING, PR_REVIEW, REBUILD_PROMPT
- Its own `feat/chapter-XX-*` branch with Conventional Commits, merged into `main`

After Chapter 12: integration review, full test suite, master architecture
diagram and `docs/REBUILD_PROJECT_PROMPT.md`.
