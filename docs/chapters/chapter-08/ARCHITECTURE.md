# Chapter 8: Architecture

Diagrams: [judging sequence, visibility rules, batch flow](architecture/judging.md)

```
packages/engine/src/judge.ts                judgeTests(), verdictForRun(), stopAtFirstFailure()
packages/engine/src/executor/types.ts       ExecutionJob.afterRun
packages/queue/src/submission-processor.ts  runPlain() / judgeProblem(), toProblemResult()
packages/db/drizzle/0002_problem-results.sql
apps/api/src/routes/problems.ts             list, detail, submit
apps/api/src/services/submission-service.ts view() with problem + test results
apps/api/src/judge0/routes.ts               /submissions/batch (POST, GET)
```

## Data written per problem submission

| Table          | Rows                      | Visible to the user                          |
| -------------- | ------------------------- | -------------------------------------------- |
| `submissions`  | 1, verdict + passed/total | yes (stdout only if the failure is a sample) |
| `test_results` | one per test that ran     | status, time, memory; data for samples       |
