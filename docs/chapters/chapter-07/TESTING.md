# Chapter 7: Testing

| Package     | Tests | New                                                                                                                                                                                                                                                          |
| ----------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| engine unit | 24    | checker (3), wrong answer through `toRunResponse` (3)                                                                                                                                                                                                        |
| db          | 21    | API keys: hash + prefix only, verify, revoke                                                                                                                                                                                                                 |
| api         | 39    | Judge0: statuses, languages, language detail, 401 ×3, Bearer, default fields, wait, wrong answer, base64 in/out, bad base64, missing/unknown field errors, limit conversion, SIGSEGV + `fields=*`, field selection, 429, other user 404; api-keys shown once |

```
pnpm lint / typecheck  ✅ 7/7
pnpm test              ✅ 97 tests
pnpm build && smoke    ✅
```

## Against real Docker (production builds)

| Request                                  | Response                                                            |
| ---------------------------------------- | ------------------------------------------------------------------- |
| C `7 / 0`, `wait=true`                   | `{"id":9,"description":"Runtime Error (SIGFPE)"}`, `exit_signal: 8` |
| Python base64, `expected_output: "abab"` | Accepted, stdout `YWJhYgo=`                                         |
