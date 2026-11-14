# Chapter 6: Architecture

Diagrams: [queue flow, sequence and lifecycle](architecture/queue-flow.md)

```
packages/queue/src/
├── redis.ts                  createRedis() (maxRetriesPerRequest: null)
├── submission-queue.ts       SubmissionQueue interface + BullSubmissionQueue
├── submission-processor.ts   SubmissionProcessor, toSubmissionResult()
└── submission-worker.ts      createSubmissionWorker()
apps/worker/src/
├── env.ts                    DATABASE_URL, REDIS_URL, WORKER_CONCURRENCY
└── index.ts                  bootstrap + graceful shutdown
packages/db/src/submission-state.ts
apps/api/src/
├── services/submission-service.ts
└── routes/{run,submissions}.ts
```

## Who depends on whom

```
apps/api ──▶ @arena/queue (interface + Bull impl) ──▶ @arena/db, @arena/engine
apps/worker ──▶ @arena/queue, @arena/engine (DockerExecutor), @arena/db
```

## Endpoints

| Method | Path                     | Auth    | Result                          |
| ------ | ------------------------ | ------- | ------------------------------- |
| POST   | `/v1/run`                | session | 200 verdict / 202 still running |
| POST   | `/v1/submissions`        | session | 201 `{token, status}`           |
| GET    | `/v1/submissions/:token` | session | 200, or 404 if not yours        |
| GET    | `/v1/submissions`        | session | your latest (`limit`, `offset`) |
