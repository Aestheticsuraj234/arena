# Chapter 4: Architecture

Diagrams: [executor flow and classification](architecture/executor-flow.md)

```
packages/engine/src/
├── executor/
│   ├── executor.ts          Executor interface
│   ├── docker-executor.ts   DockerExecutor
│   ├── classify.ts          classifyRun(), parseTimeOutput(), signalName()
│   ├── output-collector.ts  capped Writable
│   └── types.ts             ExecutionJob, ExecutionResult, RunOutcome, RunStatus
├── verdict.ts               toRunResponse()
apps/api/src/
├── lib/validate.ts          parseBody() → 422
├── routes/languages.ts      GET /v1/languages
└── routes/run.ts            POST /v1/run
```

## Dependency injection

`createApp({env, db, auth, registry, executor})`. Production passes a
`DockerExecutor`; API tests pass a `FakeExecutor` that records jobs and returns
canned results, so the API test suite needs no Docker.

## Types that cross package boundaries

| Type                                      | Defined in      | Used by                   |
| ----------------------------------------- | --------------- | ------------------------- |
| `runRequestSchema`, `RunResponse`, limits | `@arena/shared` | API, web (Ch. 10), engine |
| `ExecutionJob`, `ExecutionResult`         | `@arena/engine` | API now, worker (Ch. 6)   |
