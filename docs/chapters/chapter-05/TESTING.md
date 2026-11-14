# Chapter 5: Testing

| Suite           | Tests | Notes                                 |
| --------------- | ----- | ------------------------------------- |
| engine unit     | 18    | unchanged; OLE now checked before MLE |
| engine docker   | 31    | 17 executor + 14 sandbox attacks      |
| engine images   | 6     | unchanged                             |
| api, db, shared | 30    | unchanged                             |

```
pnpm lint / typecheck / test   ✅
pnpm test:docker               ✅ 37 tests, 3 consecutive runs
docker ps -a --filter label=arena.sandbox=true   → 0
```

## Timings of the attack suite

| Attack            | Time    |
| ----------------- | ------- |
| Fork bomb         | 3.1 s   |
| Print forever     | 0.7 s   |
| Tiny memory limit | 3.3 s   |
| Others            | ≤ 0.8 s |

Not covered: kernel exploits through allowed syscalls (out of scope for a
container sandbox; the Firecracker bonus chapter adds a VM boundary).
