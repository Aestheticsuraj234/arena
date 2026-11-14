# Chapter 8: Testing

| Package       | Tests | New                                                                                                                                                                                                                 |
| ------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| engine unit   | 30    | judgeTests ×5, stopAtFirstFailure                                                                                                                                                                                   |
| engine docker | 18    | afterRun stops after the hook says so                                                                                                                                                                               |
| api           | 53    | problems: list, samples only, 404, accept, run mode, first failure + early stop, hidden output withheld, problem limits, results in GET, 401; batch: create + ordered read, per-item errors, size limits, rate cost |

```
pnpm lint / typecheck  ✅ 7/7
pnpm test              ✅ 117 tests
pnpm build             ✅
```

## Real Docker

| Submission                                | Result                                                        |
| ----------------------------------------- | ------------------------------------------------------------- |
| Python FizzBuzz, all tests                | accepted, 3/3, 10 ms                                          |
| C++ `a > 0 ? a + b : a - b` on Sum of Two | wrong answer on test 2 (sample shows `-14`), 2 of 4 tests ran |
| Judge0 batch: Python, JavaScript, bad ID  | two tokens + `{"language_id": [...]}`                         |
