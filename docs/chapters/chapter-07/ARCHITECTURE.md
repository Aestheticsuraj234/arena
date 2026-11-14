# Chapter 7: Architecture

Diagrams: [request flow and status mapping](architecture/judge0-api.md)

```
apps/api/src/
├── judge0/
│   ├── routes.ts       /about, /statuses, /languages(/:id), /submissions(/:token)
│   ├── schema.ts       zod body, Judge0 422 errors, base64 decoding, length limits
│   ├── serializer.ts   fields, base64 output, time as seconds string
│   └── statuses.ts     JUDGE0_STATUSES, toJudge0Status()
├── middleware/api-key.ts     X-Auth-Token / Bearer → c.var.apiKey
├── lib/rate-limiter.ts       RateLimiter, RedisRateLimiter, MemoryRateLimiter
└── routes/api-keys.ts        /v1/api-keys
packages/db/src/repositories/api-key-repository.ts
packages/engine/src/checker.ts
```

## Two APIs, one service

| Concern   | `/v1/*` (Arena)                               | Judge0 (root)                 |
| --------- | --------------------------------------------- | ----------------------------- |
| Auth      | session cookie                                | API key                       |
| Naming    | camelCase                                     | snake_case                    |
| Errors    | `{error: {code, message}}`                    | `{field: [messages]}` for 422 |
| Time      | `timeMs` (number)                             | `time` ("0.010" seconds)      |
| Backed by | `SubmissionService` → queue → worker (shared) |                               |
