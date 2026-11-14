# Chapter 10: Testing

## Browser (headless Chromium, production builds, real worker and Docker)

| Step                                                            | Result |
| --------------------------------------------------------------- | ------ |
| Sign up → dashboard                                             | ✅     |
| Monaco loads from `/monaco` with the Python starter             | ✅     |
| Python run → Accepted, `Hello, Arena!`                          | ✅     |
| Switch to C++ → starter loads → Accepted                        | ✅     |
| C++ syntax error → Compilation error with compiler output       | ✅     |
| Wrong Sum of Two → "Wrong answer on test 2", expected 6 vs −14  | ✅     |
| Correct solution → Accepted, 4 ticks, "Passed all 4 test cases" | ✅     |
| Submissions list and detail                                     | ✅     |
| Create API key → call Judge0 API with it → stdout 42            | ✅     |
| Revoke the key                                                  | ✅     |
| No page errors, no failed requests                              | ✅     |

Screenshots of each screen are in [screenshots/](screenshots/). The Chapter 1
auth flow still passes (7/7).

## Automated

```
pnpm lint / typecheck  ✅ 7/7
pnpm test              ✅ 122 tests (api +1: ?wait=false)
pnpm build             ✅ 11 routes
```

Known and allowed: Next.js 16 sometimes prefetches the previous route's
segment after a client navigation and gets a 404; the router ignores it. The
browser test allows exactly that case and fails on any other 4xx/5xx.
