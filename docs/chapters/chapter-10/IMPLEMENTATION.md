# Chapter 10: Implementation notes

## Acceptance criteria

| #   | Criterion                                                                     | Result                               |
| --- | ----------------------------------------------------------------------------- | ------------------------------------ |
| 1   | Monaco loads without any CDN                                                  | ✅                                   |
| 2   | Playground runs every language's starter program                              | ✅ (Python, C++ in the browser test) |
| 3   | Compile errors show the compiler output                                       | ✅                                   |
| 4   | Problem submit shows tests ticking live, then the final verdict               | ✅                                   |
| 5   | A failed sample shows expected and actual output; untried tests say "not run" | ✅                                   |
| 6   | Submission history and detail pages work                                      | ✅                                   |
| 7   | A key created in the UI works against the Judge0 API, and revoking it works   | ✅                                   |
| 8   | No page errors and no failed requests during the whole flow                   | ✅                                   |

## Decisions

- **Client components with small hooks**, no data-fetching library. Each page
  loads one or two resources; a library would be more code than it saves.
- **Monaco from `public/`.** `@monaco-editor/react` loads from a CDN by default;
  copying `min/vs` keeps the app working offline and behind strict proxies.
  `monaco-editor` hides `package.json` in its `exports`, so the script resolves
  the folder through `node_modules` directly.
- **Submit uses `?wait=false` + SSE**, so the page shows progress instead of
  waiting up to 30 s on one request; on `done` it fetches the full result.
- **Drafts in `localStorage`, wrapped in `try/catch`.** Storage can be missing
  (private mode); drafts are a convenience, never required.
- **Tiny Markdown renderer** for statements (paragraphs, bold, code) that never
  injects HTML.

## Fixed while testing

- Exporting a constant from a page file breaks Next.js builds; the difficulty
  colors moved to `lib/status.ts`.
- The editor took the whole column and pushed results below the fold; the
  column is now a grid (toolbar, editor, 40% results).
