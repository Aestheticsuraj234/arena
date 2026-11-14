# Chapter 8: Implementation notes

## Acceptance criteria

| #   | Criterion                                                                 | Result |
| --- | ------------------------------------------------------------------------- | ------ |
| 1   | Correct solution: accepted, all tests passed, max time reported           | ✅     |
| 2   | Wrong solution: verdict and number of the first failing test              | ✅     |
| 3   | Tests after the first failure are not run                                 | ✅     |
| 4   | "Run" mode uses only sample tests                                         | ✅     |
| 5   | No response contains hidden test input, expected output or program output | ✅     |
| 6   | Judge0 batch: tokens and per-item errors in input order; ≤ 20 items       | ✅     |
| 7   | Batch read keeps request order and returns `null` for unknown tokens      | ✅     |

## Decisions

- **One container for all tests.** Compile once; each test is a `docker exec`.
  Chapter 5's cleanup between runs keeps tests independent.
- **Early stop is a hook, not executor logic.** The executor knows nothing
  about expected outputs; the judge decides when to stop.
- **Overall verdict = first failure's verdict**, like Codeforces and LeetCode.
  Reported time and memory are the maxima across tests.
- **Hidden-test stdout is withheld.** Showing it would let users reverse-
  engineer hidden inputs.
- **Batch items are validated one by one**, so one bad item does not reject
  the rest (this is what Judge0 does).

## Checked by hand

A C++ `int a+b` on `10⁹ + 10⁹` looked like an overflow bug when it was
accepted. It is not: 2×10⁹ is below INT_MAX (2 147 483 647).
