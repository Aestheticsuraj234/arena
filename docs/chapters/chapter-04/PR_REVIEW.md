# Chapter 4: Review

| #   | Finding                                               | Fix                                                    |
| --- | ----------------------------------------------------- | ------------------------------------------------------ |
| 1   | `timeout` exit 124 leaked as a runtime exit code      | Classified as TLE; TLE results have `exitCode: null`   |
| 2   | JVM banner on stderr for every Java run               | Flags moved from `JAVA_TOOL_OPTIONS` to the command    |
| 3   | Built API missing `dockerode`                         | Declared in the API; `pnpm smoke` in CI                |
| 4   | Limits were defined twice (engine and API)            | One copy in `@arena/shared`, re-exported by the engine |
| 5   | `docker exec` could hang forever if the daemon stalls | Node-side deadline kills the container                 |

Style: `classifyRun` is a pure function with its own unit tests; the executor
has no `any`; the order of checks in `classifyRun` is documented because it
matters.

Known gap, fixed in Chapter 5: the container still runs as root with a writable
root filesystem and no process limit.
