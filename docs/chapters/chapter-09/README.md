# Chapter 9: Real-time results

**Goal:** the user watches their submission move through the queue and see
each test pass as it runs, without polling.

## What you get

- `SubmissionEvent`: `status`, `test` (position, verdict, time, total), `done`
- Workers publish to Redis pub/sub (`arena:submission-events`)
- `RedisSubmissionEvents`: one subscription per API instance, fan-out per token
- `GET /v1/submissions/:token/events`: Server-Sent Events, owner only
- Subscribe-then-read, so a `done` between "read state" and "subscribe" is never lost
- Heartbeat comments every 15 s; streams close after `done` or 2 minutes
- Best effort: a lost event never fails a submission; Postgres stays the truth
- `MemorySubmissionEvents` for tests

## Watch it

```bash
curl -N -b cookies.txt http://localhost:4000/v1/submissions/<token>/events
# event: status   data: {"type":"status","status":"processing"}
# event: test     data: {"type":"test","position":0,"status":"accepted","timeMs":70,"total":3}
# …
# event: done     data: {"type":"done","status":"accepted"}
```

In the browser: `new EventSource(url, {withCredentials: true})` (Chapter 10).

[IMPLEMENTATION](IMPLEMENTATION.md) · [ARCHITECTURE](ARCHITECTURE.md) ·
[TESTING](TESTING.md) · [PR_REVIEW](PR_REVIEW.md) · [REBUILD_PROMPT](REBUILD_PROMPT.md)

**Next:** Chapter 10, the Monaco playground and problems UI.
