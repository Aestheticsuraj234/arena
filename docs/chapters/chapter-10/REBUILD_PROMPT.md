# Chapter 10: Rebuild prompt

In the API, let `POST /v1/run` and `POST /v1/problems/:slug/submit` answer 202
with the submission at once when `?wait=false`.

In `apps/web`, add `@monaco-editor/react` and `monaco-editor`; copy
`node_modules/monaco-editor/min/vs` to `public/monaco/vs` in `predev` and
`prebuild` (git-ignored) and call `loader.config({paths: {vs: '/monaco/vs'}})`.
Add a typed `api` client with `credentials: 'include'` and an `ApiError`;
`useLanguages()`; `useSubmissionStream(token)` with `EventSource`
(`withCredentials`) handling `status`, `test` and `done`.

Pages under `(app)` with a shared `AppShell` (nav: Playground, Problems,
Submissions, API keys; session guard; sign out): dashboard links; playground
(language select, starter programs, per-language drafts in `localStorage` in
`try/catch`, stdin, Run and Ctrl/⌘+Enter, result panel); problems list with
difficulty badges; problem page (statement via a minimal Markdown renderer,
samples, limits, editor, Run samples / Submit with `?wait=false`, live test
list, final verdict fetched on `done`, expected vs actual for failed samples);
submissions table and detail (read-only editor, tests); API keys (create,
show once with copy, list, revoke). Use a grid so results stay visible.
