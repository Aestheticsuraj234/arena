# Chapter 6: Implementation notes

## Acceptance criteria

| #   | Criterion                                                                    | Result                 |
| --- | ---------------------------------------------------------------------------- | ---------------------- |
| 1   | API process has no Docker work; worker runs every submission                 | ✅                     |
| 2   | Duplicate enqueue runs a submission once                                     | ✅                     |
| 3   | Executor failure retries; after the last attempt the row is `internal_error` | ✅                     |
| 4   | Two workers can never both run a submission                                  | ✅ (conditional claim) |
| 5   | A crashed worker's submission can be reclaimed after 5 minutes               | ✅                     |
| 6   | `POST /v1/run` returns 200 with the verdict, or 202 if it is slow            | ✅                     |
| 7   | Users only see their own submissions                                         | ✅                     |
| 8   | Worker stops cleanly on SIGTERM, finishing running jobs                      | ✅                     |

## Steps, in recording order

1. State machine in `@arena/db` (`canTransition`, `isFinalStatus`), and
   repository guards: `markProcessing` (with stale reclaim), `requeue`,
   `saveResult` only from `processing`, `failPermanently`.
2. `packages/queue`: Redis connection, queue, processor, worker factory.
3. `apps/worker`: env, image check at start-up, graceful shutdown.
4. API: `SubmissionService`; `/v1/run` waits through `QueueEvents`; new
   `/v1/submissions` routes. The API no longer creates a `DockerExecutor`.
5. Tests: queue tests on real Redis and Postgres with a scripted executor; API
   tests through an `InlineQueue`.

## Decisions

- **Postgres is the source of truth, Redis only carries IDs.** Jobs hold only
  `submissionId`; losing Redis loses no submissions.
- **Claiming in Postgres, not just in BullMQ.** BullMQ can redeliver a stalled
  job; the conditional update makes a second run impossible.
- **Retry only infrastructure failures.** A program that crashes is a valid
  `runtime_error` verdict, not a failed job.
- **Concurrency defaults to the CPU count**, because each sandbox gets one CPU.
- **Separate Redis connection for `QueueEvents`.** It blocks while listening.
- **Queue tests use Redis DB 15**, because they flush it.

## Measured

12 concurrent `POST /v1/run` (Python, 0.3 s sleep each), one worker with
concurrency 2: all accepted in 5.0 s.
