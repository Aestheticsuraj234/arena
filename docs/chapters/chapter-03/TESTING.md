# Chapter 3: Testing

| Suite                                  | Tests | Covers                                                                                                               |
| -------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------- |
| `@arena/engine` unit                   | 6     | six IDs, four images, unknown ID error, duplicate rejection, which languages compile, commands reference their files |
| `@arena/engine` images (`test:images`) | 6     | hello program per language inside its image with full sandbox flags, stdout exact, GNU time metadata present         |

```
pnpm format:check  ✅
pnpm lint          ✅ 5/5
pnpm typecheck     ✅ 5/5
pnpm test          ✅ 28 tests
pnpm test:images   ✅ 6/6
pnpm build         ✅
```

Not tested here: the multi-arch `PUSH=1` path (needs a registry login). The base
images are all published for amd64 and arm64.
