# Chapter 9: Architecture

Diagrams: [fan-out and stream sequence](architecture/realtime.md)

```
packages/shared/src/run.ts               SubmissionEvent
packages/queue/src/submission-events.ts  SubmissionEvents, RedisSubmissionEvents,
                                         MemorySubmissionEvents, NO_EVENTS
packages/queue/src/submission-processor.ts  emits status / test / done
apps/worker/src/index.ts                 publisher connection
apps/api/src/routes/submission-events.ts streamSSE handler
```

## Event contract

| Event    | When                                | Fields                                  |
| -------- | ----------------------------------- | --------------------------------------- |
| `status` | on connect; when a worker claims it | `status`                                |
| `test`   | after each test case runs           | `position`, `status`, `timeMs`, `total` |
| `done`   | after the verdict is saved          | final `status`                          |

The processor's constructor now takes an options object (`events`,
`staleAfterMs`), so new optional collaborators do not change every call site.
