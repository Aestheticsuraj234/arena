# Chapter 9: Implementation notes

## Acceptance criteria

| #   | Criterion                                                     | Result          |
| --- | ------------------------------------------------------------- | --------------- |
| 1   | Stream sends the current status first                         | ✅              |
| 2   | `processing`, one `test` per test case, then `done`, in order | ✅              |
| 3   | Stream closes after `done` and releases its listener          | ✅              |
| 4   | A finished submission gets `status` + `done` immediately      | ✅              |
| 5   | Only the owner can open the stream                            | ✅              |
| 6   | Events reach every API instance, only for the right token     | ✅ (Redis test) |

## Decisions

- **SSE, not WebSockets.** Updates only flow one way; SSE works over plain
  HTTP, through proxies, with cookies, and reconnects by itself.
- **Redis pub/sub, not BullMQ events.** Per-test progress is not a job event,
  and pub/sub reaches every API instance with no storage.
- **One subscription per API instance.** Thousands of open streams share one
  Redis connection; a `Map<token, Set<listener>>` does the fan-out.
- **Subscribe, then read.** Reading first could miss a `done` that arrives in
  between, and the stream would hang until its timeout.
- **Events are best effort.** Publishing errors are swallowed; clients can
  always fall back to `GET /v1/submissions/:token`.

## Measured (real Docker, Java FizzBuzz, 3 tests)

| Event                  | Time after opening |
| ---------------------- | ------------------ |
| status: processing     | 0.02 s             |
| test 1 (after `javac`) | 1.13 s             |
| test 2                 | 1.36 s             |
| test 3                 | 1.60 s             |
| done: accepted         | 1.65 s             |
