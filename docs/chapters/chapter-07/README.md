# Chapter 7: Judge0-compatible submissions API

**Goal:** any app that talks to Judge0 CE can point at Arena by changing its
base URL and sending an Arena API key.

## What you get

- `GET /about`, `/statuses`, `/languages`, `/languages/:id`
- `POST /submissions` with `base64_encoded`, `wait` and `fields`, Judge0 limits
  (`cpu_time_limit` in seconds, `memory_limit` in KB), `expected_output`
- `GET /submissions/:token` with `fields` (default set, a list, or `*`)
- Judge0 status IDs and descriptions, including per-signal runtime errors
- Judge0-style 422 bodies: `{"language_id": ["can't be blank"]}`
- API keys: `POST/GET/DELETE /v1/api-keys`; SHA-256 hashes only; shown once
- `X-Auth-Token` (Judge0) or `Authorization: Bearer`
- Redis fixed-window rate limit per key, `X-RateLimit-*` and `Retry-After` headers
- Output checker (`outputsMatch`) → `wrong_answer`
- New `signal` column (migration `0001_add-signal`)

## Switch a Judge0 client to Arena

```bash
curl -X POST "http://localhost:4000/submissions?wait=true" \
  -H "X-Auth-Token: $ARENA_KEY" -H "Content-Type: application/json" \
  -d '{"source_code":"print(input()*2)","language_id":71,"stdin":"ab","expected_output":"abab"}'
# {"stdout":"abab\n","time":"0.010","memory":9572,"status":{"id":3,"description":"Accepted"},…}
```

Create the key while signed in: `POST /v1/api-keys {"name":"my app"}`
(Chapter 10 adds a page for it).

## Differences from Judge0

| Judge0 feature                                                                   | Arena                                    |
| -------------------------------------------------------------------------------- | ---------------------------------------- |
| `callback_url`, `compiler_options`, `command_line_arguments`, `additional_files` | Accepted and ignored                     |
| `wall_time_limit`, `number_of_runs`                                              | Ignored; wall limit is 1.5 × CPU + 0.5 s |
| Memory and output limit verdicts                                                 | Status 12 with a message (as in Judge0)  |
| Batch endpoints                                                                  | Chapter 8                                |

[IMPLEMENTATION](IMPLEMENTATION.md) · [ARCHITECTURE](ARCHITECTURE.md) ·
[TESTING](TESTING.md) · [PR_REVIEW](PR_REVIEW.md) · [REBUILD_PROMPT](REBUILD_PROMPT.md)

**Next:** Chapter 8, batch submissions and verdicts.
