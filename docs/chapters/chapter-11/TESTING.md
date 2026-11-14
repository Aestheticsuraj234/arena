# Chapter 11: Testing

| Package   | Tests | New                                                                                                                                 |
| --------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| telemetry | 5     | API metrics + service label, −1 queue depth on error, worker metrics, ops server `/metrics`, `/health` 200 → 503                    |
| api       | 62    | request ID echo/generate, route-pattern labels (no token in output), submissions counter + queue depth, metrics token, `/ready` 503 |

```
pnpm lint / typecheck  ✅ 8/8
pnpm test              ✅ 132 tests
pnpm build             ✅
```

## Against the real stack

- Prometheus 3.5 targets `arena-api` and `arena-worker`: both `up`
- 18 Judge0 submissions (3 × 6 kinds) → Prometheus: accepted 6, wrong_answer 3,
  time_limit_exceeded 3, runtime_error 3, compilation_error 3
- Rules: all 5 `ok`
- Grafana 12.1: folder "Arena", dashboard "Arena overview", 0 panels without data
  after 160 more submissions over 70 s
