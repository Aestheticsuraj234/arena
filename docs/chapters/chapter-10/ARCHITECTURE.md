# Chapter 10: Architecture

Diagrams: [routes and data flow, live submit](architecture/web-app.md)

```
apps/web/
├── scripts/copy-monaco.mjs          predev / prebuild
└── src/
    ├── app/(app)/
    │   ├── layout.tsx               AppShell
    │   ├── dashboard/  playground/  problems/  problems/[slug]/
    │   ├── submissions/  submissions/[token]/  settings/api-keys/
    ├── components/
    │   ├── app/app-shell.tsx        nav + session guard
    │   ├── editor/code-editor.tsx   Monaco wrapper (local loader, theme, Ctrl+Enter)
    │   ├── result-panel.tsx  test-list.tsx  status-badge.tsx
    │   ├── language-select.tsx  markdown-lite.tsx
    │   └── ui/badge.tsx (+ button, card, input, label)
    ├── hooks/use-languages.ts  use-submission-stream.ts
    └── lib/api.ts  languages.ts  status.ts
```

## Status colors

| Tone           | Statuses                                                       |
| -------------- | -------------------------------------------------------------- |
| green          | accepted                                                       |
| red            | wrong answer, compilation error, runtime error, internal error |
| amber          | time, memory and output limits                                 |
| grey (pulsing) | in queue, running                                              |
