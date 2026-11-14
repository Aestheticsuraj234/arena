# Chapter 12: Rebuild prompt

Add `setupDatabase(db, {migrationsFolder, seedProblems})` to `@arena/db`
(migrate, upsert languages, optionally problems) and `apps/api/src/setup-db.ts`
bundled to `dist/setup-db.js`. Add `COOKIE_DOMAIN` (Better Auth
`crossSubDomainCookies`), secure cookies only for HTTPS, and treat empty
optional env vars as unset. Next.js `output: 'standalone'` with the monorepo
root as tracing root. Set `autoInstallPeers: false` and declare `vite`.

Write `docker/Dockerfile`: base (node:22-slim + pnpm, optional `extra_ca`
secret, `BASE_REGISTRY` arg), build (install, `turbo build` for api/worker/web,
`pnpm deploy --prod --legacy` for api and worker), and runtime targets `api`
(+ drizzle folder, non-root, `/ready` health check), `worker` (root for the
Docker socket, `/health` check on 9465) and `web` (standalone server).

Write `docker-compose.prod.yml` (postgres, redis with AOF, one-shot
`setup-db`, api, worker with the Docker socket, web, caddy on 80/443/8080,
prometheus, grafana on 127.0.0.1:3001), a Caddyfile with `WEB_ADDRESS` and
`API_ADDRESS` (SSE flushing, `/metrics` blocked), `.env.production.example`,
and `scripts/setup-production.sh [domain]`. Add `tests/load/judge-load.mjs`
(TOTAL, CONCURRENCY, MIX; Judge0 `wait=true`; percentiles; fail on any non-
Accepted) and make the e2e flows read `WEB_URL`/`API_URL`. Write the final
README, `docs/DEPLOYMENT.md`, `docs/ARCHITECTURE.md` and a CI job building the
images.
