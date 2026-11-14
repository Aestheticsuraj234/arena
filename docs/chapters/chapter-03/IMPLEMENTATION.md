# Chapter 3: Implementation notes

## Acceptance criteria

| #   | Criterion                                                                        | Result                                  |
| --- | -------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | Every language's hello program prints `Hello, Arena!` from stdin                 | ✅                                      |
| 2   | Runs work with `--read-only`, `--network=none`, `--user 65534`, `--cap-drop ALL` | ✅                                      |
| 3   | GNU time reports elapsed time and peak memory                                    | ✅                                      |
| 4   | Registry returns a typed error for unknown IDs and rejects duplicates            | ✅                                      |
| 5   | Images build for amd64 and arm64 with one flag                                   | ✅ (script; native build verified here) |

## Measured (first run, this machine)

| Language   | Compile + run          |
| ---------- | ---------------------- |
| C          | 0.24 s                 |
| C++        | 0.51 s                 |
| Java       | 0.76 s                 |
| JavaScript | 0.25 s                 |
| Python     | 0.27 s                 |
| TypeScript | 1.67 s (`tsc` startup) |

These include container start; Chapter 4 keeps one container per submission
and uses `docker exec`, so batches pay start-up once.

## Decisions

- **Official base images, not one giant image.** Smaller pulls, and each
  runtime updates on its own. C and C++ share the GCC image.
- **GNU time inside the image** gives peak RSS without reading cgroup files,
  which differ between cgroup v1 and v2 hosts.
- **TypeScript is compiled with `tsc --strict --noEmitOnError`**: type errors
  are compilation errors, like on a real judge.
- **Java's class must be `Main`** and the JVM gets a 128 MB overhead on top of
  the user's memory limit, so `Main` with a 256 MB limit is not killed by the
  JVM's own footprint.
- **`sleep infinity` as the default command**: the executor starts the
  container idle and runs each step with `docker exec`.

## Problems hit

- Docker Hub returned 429 (anonymous pull limit). Added `BASE_REGISTRY` so the
  same Dockerfiles build from the AWS public mirror of the official images.
- `npm install -g` inside the build failed behind a TLS-intercepting proxy. Added
  an optional BuildKit secret `extra_ca` passed with `EXTRA_CA_CERT`.
