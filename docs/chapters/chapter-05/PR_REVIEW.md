# Chapter 5: Review

| #   | Finding                                                            | Fix                                        |
| --- | ------------------------------------------------------------------ | ------------------------------------------ |
| 1   | Output overflow became `internal_error` (`time` was killed too)    | Return OLE directly from the overflow flag |
| 2   | Tiny memory limits were not enforced until 512 MB                  | `container.update()` after compile         |
| 3   | PID 1 test asserted the wrong thing                                | Asserts the sandbox keeps working          |
| 4   | Background-child test assumed a hang that Docker does not have     | Asserts a fast, normal finish              |
| 5   | `Partial<typeof DEFAULT_LIMITS>` had literal types from `as const` | `Partial<ExecutionLimits>`                 |
| 6   | Memory tests depended on host OOM speed                            | 5 s time limit in memory tests, documented |

Style: `SandboxPolicy` documents why each field exists; magic numbers are named
constants (`TOOLING_MEMORY_KB`, `EXEC_GRACE_MS`).
