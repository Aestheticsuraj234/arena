# Chapter 6: Job queue and workers

**Goal:** the API never runs code itself. It stores a submission and puts a job
on a queue; workers (as many as you like, on as many machines) run it.

## What you get

- `packages/queue`: `BullSubmissionQueue`, `SubmissionProcessor`, `createSubmissionWorker()`
- `apps/worker`: a separate process with configurable concurrency and graceful shutdown
- Job ID = submission ID, so enqueueing twice runs once
- 3 attempts with exponential backoff for infrastructure errors, then `internal_error`
- Submission state machine: `in_queue → processing → verdict`, with requeue and
  stale-claim recovery; a final verdict can never be overwritten
- `POST /v1/run` now queues and waits (200), or answers 202 with the token after `RUN_WAIT_MS`
- `POST /v1/submissions` (201 + token), `GET /v1/submissions/:token`, `GET /v1/submissions`
- API tests run the real processor through an in-memory queue

## Run it

```bash
docker compose up -d     # Postgres + Redis
pnpm dev                 # API, worker and web together
```

Scale out by starting more workers: `WORKER_CONCURRENCY=4 pnpm --filter @arena/worker start`.

[IMPLEMENTATION](IMPLEMENTATION.md) · [ARCHITECTURE](ARCHITECTURE.md) ·
[TESTING](TESTING.md) · [PR_REVIEW](PR_REVIEW.md) · [REBUILD_PROMPT](REBUILD_PROMPT.md)

**Next:** Chapter 7, the Judge0-compatible submissions API.
