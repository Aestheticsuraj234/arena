# Chapter 2: Architecture

Diagrams: [ER diagram](architecture/er-diagram.md) ·
[integration flow](architecture/integration-flow.md)

## Package layout

```
packages/db/
├── drizzle/                     generated SQL + snapshots (committed)
├── drizzle.config.ts
├── src/
│   ├── client.ts                createDb(), isDatabaseUp()
│   ├── migrate.ts / seed.ts     scripts
│   ├── seed-data.ts             languages + problems
│   ├── schema/                  auth, enums, languages, problems, api-keys, submissions
│   └── repositories/            language, problem, submission
└── test/repositories.test.ts
```

## Repository pattern

Callers never write SQL. They get typed rows (`Submission`, `ProblemWithTests`)
and intent-named methods (`markProcessing`, `saveResult`). Chapter 6's worker
and Chapter 7's API share the same `SubmissionRepository`, so the status rules
live in one place.

## Submission lifecycle (columns)

| Phase  | Columns written                                                                          | By     |
| ------ | ---------------------------------------------------------------------------------------- | ------ |
| Create | source, stdin, expected output, limits, `status = in_queue`                              | API    |
| Claim  | `status = processing`, `started_at`                                                      | Worker |
| Finish | status (verdict), stdout, stderr, compile output, exit code, time, memory, `finished_at` | Worker |
