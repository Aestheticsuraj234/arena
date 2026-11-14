# Chapter 4: Implementation notes

## Acceptance criteria

| #   | Criterion                                                                | Result |
| --- | ------------------------------------------------------------------------ | ------ |
| 1   | Hello works in all six languages through the executor                    | ✅     |
| 2   | Compile errors (C syntax, TypeScript types) return the compiler output   | ✅     |
| 3   | Runtime error returns stderr and the exit code; segfault names `SIGSEGV` | ✅     |
| 4   | Infinite loop and `sleep(10)` both end as TLE within the wall limit      | ✅     |
| 5   | Allocating past the memory limit ends as MLE                             | ✅     |
| 6   | Several inputs reuse one container                                       | ✅     |
| 7   | No container is left behind                                              | ✅     |
| 8   | `POST /v1/run` validates input and returns 401 / 422 correctly           | ✅     |

## How we found the rules

Before writing `classifyRun`, we ran six probe programs under
`/usr/bin/time … timeout -s KILL 1` in the Python image:

| Program            | Result                                  |
| ------------------ | --------------------------------------- |
| `print(1)`         | exit 0, 9 MB                            |
| `while True: pass` | signal 9, wall = 1.00 s                 |
| 300 MB allocation  | signal 9, wall = 0.11 s, peak ≈ the cap |
| `sys.exit(3)`      | exit 3                                  |
| `1/0`              | exit 1                                  |
| self-`SIGSEGV`     | signal 11                               |

SIGKILL at the deadline means time; SIGKILL early means memory.

## Decisions

- **One container per job, `docker exec` per input.** Batches (Chapter 8) pay
  container start-up once.
- **Container memory = max(limit + overhead, 512 MB)**, so compilers have room
  even when the user's limit is small. The user's limit is still enforced from
  the measured peak.
- **Wall limit = 1.5 × time limit + 0.5 s.** Leaves room for I/O while catching
  `sleep`. The verdict uses CPU time.
- **Two timeouts.** `timeout -s KILL` inside the container, and a Node-side
  deadline that kills the container if `docker exec` itself hangs.

## Bugs found in end-to-end testing

- `timeout` sometimes exits 124 instead of dying from signal 9. The exit code
  leaked into the result. Now both count as a timeout, and TLE has no exit code.
- `JAVA_TOOL_OPTIONS` made the JVM print a line to stderr on every run. The
  flags moved into the Java command.
- The built API could not find `dockerode` (dependency of a workspace package).
  `pnpm smoke` now starts the real build in CI.
