# Chapter 6: Testing

| Package         | Tests | New coverage                                                                               |
| --------------- | ----- | ------------------------------------------------------------------------------------------ |
| `@arena/db`     | 18    | state machine (3); no overwrite, requeue, stale reclaim, permanent failure                 |
| `@arena/queue`  | 6     | real Redis: verdict stored, dedupe, retry, final failure, concurrency = 3, depth           |
| `@arena/worker` | 3     | env defaults and validation                                                                |
| `@arena/api`    | 21    | run → token, 202 path; submissions: create/read, other user 404, bad token, list mine, 401 |
| engine, shared  | 22    | unchanged                                                                                  |

```
pnpm lint / typecheck   ✅ 7/7
pnpm test               ✅ 70 tests
pnpm test:docker        ✅ 37 tests
pnpm build && pnpm smoke ✅
```

## End to end (production builds, real Docker)

- `POST /v1/run` Python reverse → 200 accepted `anera`
- `POST /v1/submissions` Java → 201; 3 s later `GET` → accepted `42`, 30 ms, 34 MB
- 12 concurrent runs → 12 × 200 accepted in 5.0 s (concurrency 2)
