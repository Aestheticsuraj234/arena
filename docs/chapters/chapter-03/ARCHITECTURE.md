# Chapter 3: Architecture

Diagram: [runtimes and class hierarchy](architecture/runtimes.md)

```
docker/runtimes/{gcc,java,node,python}/Dockerfile
scripts/build-images.sh
packages/engine/
├── src/languages/
│   ├── language-runner.ts     interface + abstract bases + runtimeImage()
│   ├── runners.ts             six concrete runners
│   └── language-registry.ts   registry + UnsupportedLanguageError
└── test/
    ├── unit/                  registry tests (run in `pnpm test`)
    ├── images/                Docker smoke tests (`pnpm test:images`)
    └── fixtures/programs.ts   hello programs, reused in Chapters 4–5
```

## Patterns

| Pattern       | Where                                 |
| ------------- | ------------------------------------- |
| Strategy      | `LanguageRunner` and its six classes  |
| Template base | `CompiledRunner`, `InterpretedRunner` |
| Registry      | `LanguageRegistry` keyed by Judge0 ID |

## Sandbox contract every image meets

| Need               | How                                         |
| ------------------ | ------------------------------------------- |
| Runs as non-root   | `--user 65534:65534` (nobody)               |
| Read-only root FS  | No writes outside `/box` and `/tmp` (tmpfs) |
| No network         | Nothing installs at run time                |
| Memory measurement | `/usr/bin/time -f '%e %M'`                  |
