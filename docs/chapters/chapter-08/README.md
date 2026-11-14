# Chapter 8: Batch submissions and verdicts

**Goal:** judge code like LeetCode: run every test case in one sandbox, stop
at the first failure, say which test failed, and never leak hidden tests.
Plus Judge0's batch endpoints.

## What you get

- `judgeTests()`: per-test verdicts, overall verdict, passed/total, max time and memory
- `stopAtFirstFailure()` hook; the executor skips the remaining inputs
- `GET /v1/problems`, `GET /v1/problems/:slug` (samples only)
- `POST /v1/problems/:slug/submit` with `mode: "run"` (samples) or `"submit"` (all tests)
- Problem limits come from the problem, not the request
- `test_results` saved per test; `tests_passed`, `tests_total`, `sample_only` columns (migration `0002`)
- Hidden tests: status, time and memory only; their stdout is withheld even on failure
- Judge0 `POST /submissions/batch` (≤ 20, per-item errors) and `GET /submissions/batch?tokens=…`
- Batches charge one rate-limit unit per item

## Try it

```bash
curl -b cookies.txt -H 'Content-Type: application/json' \
  -d '{"languageId":71,"mode":"submit","sourceCode":"a,b=map(int,input().split())\nprint(a+b)"}' \
  http://localhost:4000/v1/problems/sum-of-two/submit
# {"status":"accepted","testsPassed":4,"testsTotal":4,"message":"Passed all 4 test cases",…}
```

[IMPLEMENTATION](IMPLEMENTATION.md) · [ARCHITECTURE](ARCHITECTURE.md) ·
[TESTING](TESTING.md) · [PR_REVIEW](PR_REVIEW.md) · [REBUILD_PROMPT](REBUILD_PROMPT.md)

**Next:** Chapter 9, real-time results.
