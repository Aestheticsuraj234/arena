# Chapter 6: Review

| #   | Finding                                                               | Fix                                                 |
| --- | --------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | A stalled BullMQ job would find its row stuck in `processing` forever | Stale reclaim in `markProcessing(id, staleAfterMs)` |
| 2   | A late duplicate could overwrite a verdict                            | `saveResult` only updates rows in `processing`      |
| 3   | Retry after an executor error could not claim the row again           | `requeue()` before rethrowing                       |
| 4   | Queue tests flushed the Redis a dev worker uses                       | Tests use DB 15 (`TEST_REDIS_URL`)                  |
| 5   | `ioredis` 5 declared while BullMQ 6 ships 6                           | Aligned on `^6.0.0`                                 |
| 6   | Another user's token returned 403, revealing it exists                | 404 for both missing and not-yours                  |

Style: the processor depends on interfaces (`Executor`, repository), not on
Docker or BullMQ, which is why API tests can run it in-process.
