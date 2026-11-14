# Chapter 12: Architecture

Diagrams: [deployment, start order, images](architecture/deployment.md) ·
whole system: [docs/ARCHITECTURE.md](../../ARCHITECTURE.md)

```
docker/Dockerfile                 build → api | worker | web
docker-compose.prod.yml           production stack
.env.production.example           settings template
ops/caddy/Caddyfile               WEB_ADDRESS, API_ADDRESS
scripts/setup-production.sh       one-command deploy
apps/api/src/setup-db.ts          → dist/setup-db.js
packages/db/src/setup.ts          setupDatabase(): migrate + seed
tests/e2e/                        auth-flow.mjs, app-flow.mjs (WEB_URL, API_URL)
tests/load/judge-load.mjs         TOTAL, CONCURRENCY, MIX
docs/DEPLOYMENT.md  docs/ARCHITECTURE.md  docs/REBUILD_PROJECT_PROMPT.md
```

## Configuration

| Variable                                                            | Used by  | Meaning                                         |
| ------------------------------------------------------------------- | -------- | ----------------------------------------------- |
| `WEB_ADDRESS`, `API_ADDRESS`                                        | Caddy    | Site addresses; `http://` prefix disables HTTPS |
| `WEB_URL`, `API_URL`                                                | api, web | Public URLs (CORS, cookies, client base URL)    |
| `COOKIE_DOMAIN`                                                     | api      | Parent domain shared by both hosts              |
| `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET`, `GRAFANA_ADMIN_PASSWORD` | all      | Secrets                                         |
| `WORKER_CONCURRENCY`                                                | worker   | Parallel sandboxes (≤ vCPUs)                    |
| `RATE_LIMIT_PER_MINUTE`                                             | api      | Judge0 submissions per key per minute           |
| `METRICS_TOKEN`                                                     | api      | Optional bearer token for `/metrics`            |
| `SEED_PROBLEMS`                                                     | setup-db | Load the sample problems                        |
| `BASE_REGISTRY`                                                     | builds   | Mirror for base images                          |
