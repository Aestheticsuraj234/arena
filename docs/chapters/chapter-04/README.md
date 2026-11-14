# Chapter 4: The executor: running code once

**Goal:** send code, get a correct verdict back. One container per job, one
`docker exec` per input, always cleaned up.

## What you get

- `Executor` interface and `DockerExecutor` (dockerode)
- Source copied in over stdin; compile once; one run per input in the same container
- Time measured as CPU time, memory as peak RSS (GNU time), wall-clock kill with `timeout`
- `classifyRun()`: ok, runtime error (with signal name), TLE, MLE, output limit
- `OutputCollector`: keeps at most N bytes and remembers if it dropped any
- `toRunResponse()`: execution result → API response
- `GET /v1/languages` (public) and `POST /v1/run` (signed in, synchronous)
- `ValidationError` (422) and `parseBody()` with zod
- `pnpm smoke`: starts the built API and checks `/health` (also in CI)

## Try it

```bash
pnpm images:build && pnpm build && pnpm --filter @arena/api start
# sign in through the web app, then:
curl -b cookies.txt -H 'Content-Type: application/json' \
  -d '{"languageId":71,"sourceCode":"print(input()[::-1])","stdin":"arena"}' \
  http://localhost:4000/v1/run
# {"status":"accepted","stdout":"anera\n","timeMs":10,"memoryKb":9580,…}
```

[IMPLEMENTATION](IMPLEMENTATION.md) · [ARCHITECTURE](ARCHITECTURE.md) ·
[TESTING](TESTING.md) · [PR_REVIEW](PR_REVIEW.md) · [REBUILD_PROMPT](REBUILD_PROMPT.md)

**Next:** Chapter 5, sandbox hardening.
