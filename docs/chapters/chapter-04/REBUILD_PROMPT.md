# Chapter 4: Rebuild prompt

In `packages/engine`, add an `Executor` interface (`execute(job) →
{compile, runs[]}`) and a `DockerExecutor` using dockerode. Per job: create a
container from the runner's image with `sleep infinity`, `NetworkMode: none`,
`Memory = MemorySwap = max(limit + overhead, 512 MB)`, 1 CPU, tmpfs `/box` and
`/tmp`; write the source with `exec sh -c 'cat > "$0"' file` over stdin; compile
once under `timeout -s KILL 15`; for each input run
`/usr/bin/time -f 'ARENA_META %e %U %S %M' -o /tmp/.arena-meta timeout -s KILL
<1.5×limit+0.5s> <run command>` with stdin attached and stdout/stderr captured
by a capped `OutputCollector`; read the meta file; classify; always remove the
container. Add a Node-side deadline that kills the container.

`classifyRun(raw, thresholds)` order: TLE if (SIGKILL or exit 124) at the wall
deadline or CPU > limit; MLE if SIGKILL or peak > limit + overhead; OLE if
output was truncated; runtime error on any other signal or non-zero exit;
otherwise ok. `toRunResponse()` maps ok to accepted.

Move limits and `runRequestSchema` into `@arena/shared`. In the API add
`GET /v1/languages` (active and registered) and `POST /v1/run` (signed in,
synchronous), `ValidationError` (422) and `parseBody()`. Inject `registry` and
`executor` into `createApp`; tests use a `FakeExecutor`. Add
`scripts/smoke-api.sh` and run it in CI after the build.
