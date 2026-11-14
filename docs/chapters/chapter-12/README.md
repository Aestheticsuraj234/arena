# Chapter 12: Deployment, load testing and final setup

**Goal:** go from a laptop to a server with one command, prove it holds up
under load, and leave a README anyone can follow.

## What you get

- `docker/Dockerfile`: one build stage, three runtime targets (`api`, `worker`, `web`)
- `docker-compose.prod.yml`: Postgres, Redis, one-shot `setup-db`, API, worker,
  web, Caddy (HTTPS), Prometheus, Grafana, with health checks and start order
- `ops/caddy/Caddyfile`: two hostnames; SSE flushing; `/metrics` blocked
- `scripts/setup-production.sh`: secrets, runtime images, stack, readiness wait
- `COOKIE_DOMAIN` for sessions shared across web and API subdomains
- `setup-db`: migrations + languages (+ samples), safe on every deploy
- `tests/load/judge-load.mjs`: end-to-end load test through the Judge0 API
- `tests/e2e`: browser flows, runnable against dev or production
- `docs/DEPLOYMENT.md`, `docs/ARCHITECTURE.md`, final `README.md`, and
  `docs/REBUILD_PROJECT_PROMPT.md`
- CI builds the production images

## Deploy

```bash
./scripts/setup-production.sh arena.example.com
```

## Load test

```bash
API_URL=https://api.arena.example.com ARENA_KEY=arena_… TOTAL=200 CONCURRENCY=20 pnpm load-test
```

[IMPLEMENTATION](IMPLEMENTATION.md) · [ARCHITECTURE](ARCHITECTURE.md) ·
[TESTING](TESTING.md) · [PR_REVIEW](PR_REVIEW.md) · [REBUILD_PROMPT](REBUILD_PROMPT.md)

**Next (optional):** the bonus chapter, a Firecracker executor behind the same
`Executor` interface.
