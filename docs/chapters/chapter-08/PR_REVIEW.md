# Chapter 8: Review

| #   | Finding                                                                    | Fix                                     |
| --- | -------------------------------------------------------------------------- | --------------------------------------- |
| 1   | `rows.map(toSubmissionView)` passed the index as `problem` (caught by tsc) | Explicit arrow function                 |
| 2   | Hidden test output leaked through the submission's `stdout`                | `null` when the first failure is hidden |
| 3   | `/submissions/batch` would match `/submissions/:token`                     | Batch routes registered first           |
| 4   | Processor file overwritten by Prettier between edits                       | Re-read before writing                  |
| 5   | Unused `SEED_PROBLEMS` import in queue tests                               | Removed                                 |

Style: the judge is pure and unit-tested without Docker; the processor only
wires repositories, executor and judge together.
