# Chapter 6: Rebuild prompt

Add a submission state machine to `@arena/db` (`FINAL_STATUSES`,
`isFinalStatus`, `canTransition`) and repository guards: `markProcessing(id,
staleAfterMs = 5 min)` claims `in_queue` or stale `processing` rows;
`requeue(id)`; `saveResult` only from `processing` (returns undefined
otherwise); `failPermanently(id, message)`.

Create `packages/queue` (BullMQ 6, ioredis 6): `createRedis(url)` with
`maxRetriesPerRequest: null`; `SubmissionQueue` interface (enqueue many,
waitUntilFinished, depth, close) and `BullSubmissionQueue` (queue
`submissions`, jobId = submission ID, 3 attempts, exponential backoff, own
connection for `QueueEvents`); `SubmissionProcessor` (claim → execute →
saveResult; on executor error requeue and rethrow; `giveUp` on the last
attempt); `createSubmissionWorker({connection, processor, concurrency})`.

Create `apps/worker` with env (`WORKER_CONCURRENCY` defaults to CPU count),
an image check at start, and graceful shutdown. In the API, replace the
executor dependency with `queue`; add `SubmissionService`; make `/v1/run`
queue and wait up to `RUN_WAIT_MS` (200 or 202); add `POST/GET
/v1/submissions` and `GET /v1/submissions/:token` (404 for other users).
Test the API with an `InlineQueue` that runs the real processor and a fake
executor; test the queue against Redis DB 15.
