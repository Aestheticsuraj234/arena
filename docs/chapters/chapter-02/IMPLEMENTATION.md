# Chapter 2: Implementation notes

## Acceptance criteria

| #   | Criterion                                                               | Result |
| --- | ----------------------------------------------------------------------- | ------ |
| 1   | `pnpm db:migrate` creates every table on an empty database              | ✅     |
| 2   | `pnpm db:seed` is idempotent (run twice, no duplicates)                 | ✅     |
| 3   | Sign-up, sign-in and `/v1/me` still work through the Drizzle adapter    | ✅     |
| 4   | Two concurrent `markProcessing()` calls: exactly one wins               | ✅     |
| 5   | `findByTokens()` returns results in request order, with gaps for misses | ✅     |
| 6   | Problem upsert replaces test cases instead of appending                 | ✅     |
| 7   | Production build of the API starts and serves auth                      | ✅     |

## Steps, in recording order

1. Create `packages/db` with `drizzle.config.ts` (`casing: 'snake_case'`).
2. Write the auth tables to match Better Auth's fields, then the engine tables.
3. `pnpm db:generate --name initial-schema` and read the SQL before committing.
4. `createDb()` returns `{db, pool}`; `migrate.ts` applies `drizzle/`.
5. Repositories: classes that take a `Database` and hide every query.
6. Switch `createAuth()` to `drizzleAdapter(db, {provider: 'pg', schema})`.
7. Seed languages and problems; add `db:migrate` as a Turbo dependency of `test`.

## Decisions

- **Language IDs are Judge0's IDs** (71 = Python, 54 = C++…), so a Judge0
  client works unchanged in Chapter 7.
- **`token` separate from `id`.** The token is public; the ID stays internal.
- **Claiming with a conditional update** (`where status = 'in_queue'`) instead
  of a lock table. It is one round trip and race-free.
- **Limits stored per submission** (`time_limit_ms`, `memory_limit_kb`), so a
  result can always be explained even if defaults change later.
- **No Redis here.** Postgres is the source of truth; Redis (Chapter 6) only
  carries jobs and events.

## Bug caught

The API's tsup build bundled `pg`, a CommonJS package, into an ESM file, and the
server crashed at start with "Dynamic require of events". Unit tests run from
source, so only the production run caught it. Fix: bundle only `@arena/*` and
keep every other package external.
