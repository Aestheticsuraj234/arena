# Chapter 3: Review

| #   | Finding                                                  | Fix                                                |
| --- | -------------------------------------------------------- | -------------------------------------------------- |
| 1   | Build failed on Docker Hub rate limits                   | `ARG BASE_REGISTRY` in every Dockerfile            |
| 2   | npm in the node image failed behind a TLS proxy          | Optional `extra_ca` BuildKit secret                |
| 3   | Image tests would slow every `pnpm test` and need Docker | Split into `test/unit` (default) and `test/images` |
| 4   | Commands returned mutable arrays                         | `readonly string[]` with `as const`                |

Style: classes use `readonly` fields and `override` where they change a base
default; no `any`; the registry error is a typed class, not a string.
