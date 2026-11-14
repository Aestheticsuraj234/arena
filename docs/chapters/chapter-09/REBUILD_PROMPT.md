# Chapter 9: Rebuild prompt

Add a `SubmissionEvent` union to `@arena/shared`: `status`, `test` (position,
status, timeMs, total) and `done`. In `@arena/queue`, add a `SubmissionEvents`
interface (publish, subscribe(token, listener) → unsubscribe, close), a Redis
implementation (publish on channel `arena:submission-events`; one duplicated
subscriber connection per process; a `Map<token, Set<listener>>` hub) and an
in-memory one. Give `SubmissionProcessor` an options object with `events`;
emit `status: processing` after claiming, a `test` event from the `afterRun`
hook, and `done` after a saved verdict (and in `giveUp`). Swallow publish errors.

In the API, add `GET /v1/submissions/:token/events` with Hono `streamSSE`:
owner only; subscribe first, then read the row and send `status`; if final,
send `done` and close; otherwise forward events until `done`, with a heartbeat
comment every 15 s and a 2-minute cap; always unsubscribe. Test it with the
in-memory events and a paused inline queue, and test Redis fan-out between two
instances.
