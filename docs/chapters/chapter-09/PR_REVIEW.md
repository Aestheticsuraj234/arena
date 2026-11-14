# Chapter 9: Review

| #   | Finding                                                             | Fix                                              |
| --- | ------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | Reading state before subscribing could miss `done`                  | Subscribe first, then read                       |
| 2   | A publish error could fail the submission                           | `emit()` swallows errors; events are best effort |
| 3   | A `done` could be sent for a verdict that was not saved (duplicate) | Only after `saveResult` returns a row            |
| 4   | Idle streams can be closed by proxies                               | Heartbeat comment every 15 s                     |
| 5   | Streams could stay open forever                                     | 2-minute maximum; clients reconnect              |
| 6   | Positional processor arguments kept growing                         | `ProcessorOptions` object                        |

Style: the SSE handler owns its listener and always unsubscribes in `finally`;
the test checks the listener count drops back to zero.
