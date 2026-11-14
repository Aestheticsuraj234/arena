# Chapter 9: Testing

| Package | Tests | New                                                                                                                                  |
| ------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| queue   | 7     | Redis pub/sub between two instances: right token only, unsubscribe works                                                             |
| api     | 56    | SSE: finished submission (status + done), live problem judging (7 events in order, listener released), 404 for others and bad tokens |

```
pnpm lint / typecheck  ✅ 7/7
pnpm test              ✅ 121 tests
pnpm build             ✅
```

Real stack: `curl -N` on a Java FizzBuzz submission received 5 events in
1.65 s (see IMPLEMENTATION).

Not tested: reconnect with `Last-Event-ID` (the stream re-sends the current
status on reconnect, which is enough for this client).
