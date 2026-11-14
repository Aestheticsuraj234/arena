# Chapter 4: Testing

| Suite         | Tests | Covers                                                                                                                                                        |
| ------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| engine unit   | 18    | registry (6), `classifyRun` incl. exit 124 both ways (9), `parseTimeOutput` (3)                                                                               |
| engine docker | 17    | hello ×6, multiple inputs, C and TS compile errors, runtime error, SIGSEGV, loop TLE, Java loop TLE without stderr noise, sleep TLE, MLE, CPU timing, cleanup |
| engine images | 6     | unchanged                                                                                                                                                     |
| api           | 15    | Chapter 1 tests, registry vs seed IDs, languages list, run: 401, defaults, compile error, unknown language, empty source, limit bounds, bad JSON              |

```
pnpm lint / typecheck / test   ✅  (51 tests without Docker)
pnpm test:docker               ✅  23 tests
pnpm build && pnpm smoke       ✅
```

## End to end (production build, real Docker)

| Request                       | Response               | Time   |
| ----------------------------- | ---------------------- | ------ |
| Python sum, stdin `2 3`       | accepted, `5`          | 0.41 s |
| C++ sum of two 10⁹            | accepted, `2000000000` | 0.78 s |
| Java `while(true)`, 1 s limit | time_limit_exceeded    | 2.9 s  |
