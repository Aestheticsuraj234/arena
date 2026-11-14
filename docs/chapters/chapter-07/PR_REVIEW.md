# Chapter 7: Review

| #   | Finding                                                  | Fix                                                |
| --- | -------------------------------------------------------- | -------------------------------------------------- |
| 1   | Signal was only in a human message, not machine-readable | `signal` column + migration                        |
| 2   | Length limits checked before base64 decoding             | Checked after decoding, per field                  |
| 3   | Browsers could not read rate-limit headers               | `exposeHeaders` in CORS                            |
| 4   | `X-Auth-Token` blocked by CORS preflight                 | Added to `allowHeaders`                            |
| 5   | Restart script left an old worker running                | Kill every `dist/index.js` process before starting |
| 6   | `lastUsedAt` update could slow every request             | Fire-and-forget `touch()`                          |

Style: Judge0 shapes live behind `toJudge0Submission`, so the database row
never leaks into the response; statuses are a typed `as const` table with an
exhaustive `switch`.
