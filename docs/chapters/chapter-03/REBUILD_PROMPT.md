# Chapter 3: Rebuild prompt

Add `docker/runtimes/{gcc,java,node,python}/Dockerfile` based on `gcc:14-bookworm`,
`eclipse-temurin:21-jdk`, `node:22-slim` (+ global `typescript@5`, `@types/node@22`)
and `python:3.12-slim`. Each installs GNU `time`, uses `WORKDIR /box` and
`CMD ["sleep", "infinity"]`, and takes `ARG BASE_REGISTRY=docker.io/library`. The
node image accepts an optional BuildKit secret `extra_ca` for npm. Tag them
`arena-runtime-<name>:1`. `scripts/build-images.sh` builds natively, or with
`PUSH=1` uses buildx for linux/amd64 + linux/arm64.

Add `packages/engine` with a `LanguageRunner` interface (languageId, slug,
displayName, image, sourceFile, memoryOverheadKb, compileCommand(),
runCommand()), abstract `CompiledRunner` and `InterpretedRunner`, and runners
for C (50, gcc -O2 -std=c17), C++ (54, g++ -O2 -std=c++20), Java (62, class
`Main`, +128 MB overhead), JavaScript (63), Python (71), TypeScript (74, `tsc
--strict --noEmitOnError`). `LanguageRegistry` with register/has/get/list/images
and `UnsupportedLanguageError`. Unit tests for the registry, and Docker smoke
tests that run a stdin hello program per language with `--read-only
--network=none --user 65534 --cap-drop ALL`.
