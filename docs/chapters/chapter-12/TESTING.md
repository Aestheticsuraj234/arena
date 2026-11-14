# Chapter 12: Testing

## Production stack (this machine, `arena.test` / `api.arena.test`)

| Check                                           | Result              |
| ----------------------------------------------- | ------------------- |
| `setup-db`: migrations, 6 languages, 3 problems | ✅                  |
| api `healthy`, worker `healthy`                 | ✅                  |
| `GET /ready` through Caddy                      | ✅ database + redis |
| `GET /metrics` through Caddy                    | ✅ 404              |
| Web `/` → 307 `/sign-in`                        | ✅                  |
| Browser auth flow (7) + app flow (12)           | ✅ 19/19            |
| Prometheus targets `arena-api`, `arena-worker`  | ✅ up               |
| Grafana `/api/health`                           | ✅ ok               |
| Load test 200 × mixed languages, 20 clients     | ✅ 200 Accepted     |

## Automated

```
pnpm lint / typecheck  ✅ 8/8
pnpm test              ✅ 135 tests (api +3: env parsing)
pnpm test:docker       ✅ 38 tests
pnpm build && smoke    ✅
docker build ×3        ✅ (CI job "images")
```

## Integration review

From a fresh clone with a new database: install, migrate, seed, lint,
typecheck, all tests, Docker tests, build and smoke all pass (see
`docs/chapters/chapter-12/PR_REVIEW.md`).
