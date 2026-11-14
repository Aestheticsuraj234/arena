# Chapter 2: Testing

| Package         | Tests | Covers                                                                                                                                                                           |
| --------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@arena/shared` | 4     | unchanged                                                                                                                                                                        |
| `@arena/db`     | 11    | DB up, languages (sorted, by ID, idempotent upsert), problems (ordered tests, replace, missing), submissions (token, single claim under race, save result, ordered batch lookup) |
| `@arena/api`    | 7     | unchanged, now through the Drizzle adapter                                                                                                                                       |

```
pnpm format:check  ✅
pnpm lint          ✅ 4/4
pnpm typecheck     ✅ 4/4
pnpm test          ✅ 22 tests (migrate runs first)
pnpm build         ✅
```

Browser: the Chapter 1 flow (7 checks) passes against the production API build.

Not tested yet: migrating a database that already has Chapter 1's camelCase
tables (documented as a one-time dev reset instead).
