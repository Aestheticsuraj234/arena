# Chapter 10: Review

| #   | Finding                                            | Fix                                                        |
| --- | -------------------------------------------------- | ---------------------------------------------------------- |
| 1   | Extra export from a page file (Next.js rejects it) | Moved to `lib/status.ts`                                   |
| 2   | Results panel hidden below the editor              | Grid layout with a 40% results row                         |
| 3   | Monaco would load from a CDN                       | Served from `public/monaco`                                |
| 4   | `localStorage` throws in some browsers             | Wrapped reads and writes in `try/catch`                    |
| 5   | Problem statements could carry HTML                | `MarkdownLite` renders text nodes only                     |
| 6   | Browser test hid every 404 behind a broad filter   | Fails on any failed request except Next's segment prefetch |

Accepted exception: page and layout files use default exports (Next.js
requirement). Components, hooks and libs use named exports.
