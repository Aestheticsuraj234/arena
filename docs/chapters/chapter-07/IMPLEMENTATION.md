# Chapter 7: Implementation notes

## Acceptance criteria

| #   | Criterion                                                                 | Result           |
| --- | ------------------------------------------------------------------------- | ---------------- |
| 1   | Default fields, `fields=…` and `fields=*` match Judge0's names and shapes | ✅               |
| 2   | `base64_encoded=true` decodes input and encodes output                    | ✅               |
| 3   | `wait=true` returns the finished submission                               | ✅               |
| 4   | `expected_output` mismatch → status 4                                     | ✅               |
| 5   | SIGSEGV / SIGFPE map to 7 / 9 with `exit_signal`                          | ✅ (real Docker) |
| 6   | 401 without a key, with a wrong key, with a revoked key                   | ✅               |
| 7   | 429 after the per-key limit, with `Retry-After`                           | ✅               |
| 8   | Validation errors use Judge0's `{field: [messages]}` shape                | ✅               |

## Decisions

- **Judge0 routes live in `src/judge0/`**, separate from Arena's own `/v1`
  API. The two can evolve independently.
- **Mounted at the root**, like Judge0, so clients change only the base URL.
- **Checker moved up from Chapter 8.** Judge0's `expected_output` needs it now.
  Normalization: CRLF → LF, trailing spaces per line, trailing blank lines.
- **Signal stored as its own column**, not parsed from the message.
- **Keys:** `arena_` + 240 random bits; SHA-256 is enough for random keys
  (no need for bcrypt). Prefix of 12 characters is kept to tell keys apart.
- **Rate limit before validation.** Invalid requests still cost something,
  which stops a client hammering with bad bodies.
- **Fixed window in Redis** (`INCRBY` + `EXPIRE NX` in one `MULTI`): one round
  trip, shared by every API instance.

## Bug caught end to end

SIGFPE first came back as "Runtime Error (NZEC)". An old worker process,
built before the `signal` column existed, was still consuming jobs. Lesson
for deploys: restart workers together with migrations (Chapter 12 does this
in Compose).
