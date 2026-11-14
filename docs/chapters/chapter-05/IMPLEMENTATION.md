# Chapter 5: Implementation notes

## Acceptance criteria

| #   | Criterion                                                      | Result |
| --- | -------------------------------------------------------------- | ------ |
| 1   | All 14 attack tests pass, three runs in a row                  | ✅     |
| 2   | All Chapter 4 executor tests still pass                        | ✅     |
| 3   | No container with `arena.sandbox=true` remains after the suite | ✅     |
| 4   | Restrictions live in one `SandboxPolicy`, not scattered        | ✅     |

## Steps, in recording order

1. Write `sandbox.test.ts` and run it against Chapter 4: 10 of 14 attacks get
   through. (This is the hook for the video.)
2. Add `SandboxPolicy` and `hostConfigFor()`; set `User` on the container so
   every `docker exec` runs as nobody.
3. Add `onOverflow` to `OutputCollector`; on overflow, run `kill -9 -1` as the
   sandbox user. That kills everything except PID 1 and the shell doing it.
4. Return `output_limit_exceeded` directly: the kill also stops GNU `time`, so
   there are no stats to read.
5. `container.update()` after compiling lowers the memory cap from the 512 MB
   compile floor to `limit + overhead + 16 MB`.
6. `kill -9 -1` between inputs so a background process cannot affect the next
   test case.

## What the failures taught us

- **PID 1 cannot be killed from inside**, even by the same user: the kernel
  ignores signals to a namespace's init that has no handler. The test now
  proves the sandbox keeps working instead of expecting an error.
- **Docker closes an exec stream when its process exits**, even if a child
  still holds stdout. A background process does not hang the run; cleaning up
  between inputs is what matters.
- **OOM kills are slow on cgroup v1 hosts** (2–3 s here). Memory tests use a
  5 s time limit so they test memory, not timing. cgroup v2 hosts are faster.

## Decisions

- **Docker's default seccomp profile stays on.** It already blocks `mount`,
  `ptrace`, `unshare` and other escape-related syscalls.
- **PidsLimit 128, not 32.** It counts threads, and the JVM starts about 20.
- **`OomScoreAdj: 1000`.** If the host runs low on memory, sandboxes die first,
  not the API or Postgres.
