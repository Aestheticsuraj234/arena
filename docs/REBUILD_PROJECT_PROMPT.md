# Rebuild the whole project

Paste this into a coding agent in an empty folder. It rebuilds Arena chapter by
chapter; each chapter's `REBUILD_PROMPT.md` in `docs/chapters/` has the details.

---

Build **Arena**, a self-hosted remote code execution engine in TypeScript,
in 12 chapters. After each chapter, run format, lint, typecheck, tests and
build; commit with Conventional Commits on a `feat/chapter-XX-*` branch and
merge into `main`.

1. **Project init and auth.** Turborepo + pnpm (Node 22, TypeScript 6.0,
   ESLint flat config, Prettier). `packages/shared` (zod auth schemas),
   `apps/api` (Hono, Better Auth email/password, `/health`, `/v1/me`,
   `AppError`), `apps/web` (Next.js 16, Tailwind 4, sign-up/in, protected
   dashboard, `proxy.ts`). CI with Postgres.
2. **Database.** `packages/db` with Drizzle: auth tables, `languages` (Judge0
   IDs), `problems`, `test_cases`, `api_keys`, `batches`, `submissions`
   (status enum), `test_results`; migrations; repositories; seed (6
   languages, 3 problems). Better Auth on the Drizzle adapter.
3. **Runtime images.** Dockerfiles for gcc, java, node (+tsc), python with GNU
   `time`; `LanguageRunner` strategy, compiled/interpreted bases, registry.
4. **Executor.** `DockerExecutor` (dockerode): container per job, source via
   stdin, compile once, `docker exec` per input under `timeout` and
   `/usr/bin/time`; `classifyRun` (TLE, MLE, OLE, RE with signal); `/v1/run`.
5. **Sandbox hardening.** Attack tests first; `SandboxPolicy` (nobody, cap
   drop, no-new-privileges, read-only, tmpfs, no network, pids, ulimits);
   lower the memory cap after compile; kill on output overflow; clean up
   between inputs.
6. **Queue and workers.** BullMQ (job ID = submission ID), `apps/worker`,
   conditional claim, requeue, stale reclaim, final failure; `/v1/run` waits
   or answers 202; `/v1/submissions`.
7. **Judge0 API.** `/submissions` (`wait`, `base64_encoded`, `fields`),
   `/languages`, `/statuses`, `/about`; status mapping by signal; API keys
   (SHA-256); Redis rate limiting; output checker.
8. **Batch and verdicts.** `judgeTests`, early stop hook, problem endpoints
   (`run` samples / `submit` all), hidden test data never returned, Judge0 batch.
9. **Real time.** Redis pub/sub events (`status`, `test`, `done`) and an SSE
   endpoint (subscribe before reading).
10. **Web UI.** App shell, Monaco from `public/`, playground, problems with
    live tests, submissions, API keys.
11. **Observability.** pino logs with request IDs, Prometheus metrics (route
    patterns), `/ready`, worker ops server, alerts, provisioned Grafana dashboard.
12. **Deployment.** One Dockerfile with api/worker/web targets, production
    Compose with Caddy (two hostnames, shared cookie domain), setup script,
    load test, e2e against production, final docs.

Optional bonus: a `FirecrackerExecutor` behind the same `Executor` interface.
