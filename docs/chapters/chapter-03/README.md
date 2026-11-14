# Chapter 3: Language runtime images

**Goal:** a Docker image per runtime and one class per language that knows how
to compile and run code in it, so the executor never has an `if (language ===
…)`.

## What you get

- 4 images for 6 languages: `arena-runtime-gcc` (C, C++), `-java`, `-node` (JS, TS), `-python`
- GNU `time` in every image, to measure peak memory per run
- `LanguageRunner` interface (Strategy), `InterpretedRunner` / `CompiledRunner` bases
- 6 runners: `CRunner`, `CppRunner`, `JavaRunner`, `JavaScriptRunner`, `PythonRunner`, `TypeScriptRunner`
- `LanguageRegistry` + `createDefaultRegistry()`, `UnsupportedLanguageError`
- `scripts/build-images.sh`: native builds, or amd64 + arm64 with `PUSH=1` (works on Apple Silicon)
- Image smoke tests: each language compiles and runs a stdin program in a read-only, no-network container
- A CI job that builds the images and runs those tests

## Run it

```bash
pnpm images:build          # or: ./scripts/build-images.sh
pnpm test:images
```

Rate-limited by Docker Hub? `BASE_REGISTRY=public.ecr.aws/docker/library pnpm images:build`.
Behind a proxy with its own CA? `EXTRA_CA_CERT=/path/ca.crt pnpm images:build`.

## Add a language

1. Write a runner class (extend `CompiledRunner` or `InterpretedRunner`).
2. Register it in `createDefaultRegistry()`.
3. Add its row to `SEED_LANGUAGES` with the Judge0 ID.
4. Add a hello program to `test/fixtures/programs.ts`.

[IMPLEMENTATION](IMPLEMENTATION.md) · [ARCHITECTURE](ARCHITECTURE.md) ·
[TESTING](TESTING.md) · [PR_REVIEW](PR_REVIEW.md) · [REBUILD_PROMPT](REBUILD_PROMPT.md)

**Next:** Chapter 4, the executor.
