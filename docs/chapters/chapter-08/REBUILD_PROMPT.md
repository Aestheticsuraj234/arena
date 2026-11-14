# Chapter 8: Rebuild prompt

Add `afterRun(run, index) → 'continue' | 'stop'` to `ExecutionJob` and honor
it in the executor. Add `judge.ts` to the engine: `verdictForRun` (run status,
else checker), `stopAtFirstFailure(tests)`, and `judgeTests(result, tests)`
returning status (first failure's, or accepted when all passed), per-test
verdicts, passed/total, max time and memory, and a message such as "Wrong
answer on test 3".

Add `sample_only`, `tests_passed`, `tests_total` to `submissions`
(migration), `ProblemRepository.findById`, `createBatch`. In the processor,
judge problem submissions: load tests (samples only when `sample_only`), run
them in one execution with early stop, save `test_results`, save the verdict.

API: `GET /v1/problems`, `GET /v1/problems/:slug` (samples only),
`POST /v1/problems/:slug/submit {languageId, sourceCode, mode}` using the
problem's limits. `SubmissionService.view()` adds problem slug and test
results; hidden tests show only status/time/memory, and the submission's
stdout is null when the first failure is hidden. Judge0: `POST
/submissions/batch` (≤ 20, per-item errors in order, rate cost = n) and
`GET /submissions/batch?tokens=…` (`null` for unknown), registered before
`/submissions/:token`.
