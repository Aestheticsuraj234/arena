# Chapter 2: Database and ORM layer setup

**Goal:** one typed, versioned database layer for the whole project, shared by
the API now and the worker later.

## What you get

- `packages/db`: Drizzle ORM on `pg`, snake_case columns, typed `Database` client
- Full schema: 4 auth tables, `languages`, `problems`, `test_cases`, `api_keys`,
  `batches`, `submissions`, `test_results`, plus `submission_status` and `difficulty` enums
- Versioned SQL migrations (`drizzle/0000_initial-schema.sql`) and a migrate script
- Repository pattern: `LanguageRepository`, `ProblemRepository`, `SubmissionRepository`
- `markProcessing()`: an atomic "claim" so two workers never run the same job
- Seed data: 6 languages with Judge0 IDs and 3 problems with test cases
- Better Auth now uses the Drizzle adapter; the Chapter 1 migration script is gone
- `pnpm test` migrates once before any test package runs

## Run it

```bash
pnpm db:migrate
pnpm db:seed
pnpm db:studio    # optional: browse tables
```

> Coming from Chapter 1? Its auth tables used camelCase columns. In
> development, reset once: `psql $DATABASE_URL -c 'drop schema public cascade; create schema public'`.

## Files to read first

| File                                                    | Why                                    |
| ------------------------------------------------------- | -------------------------------------- |
| `packages/db/src/schema/submissions.ts`                 | The heart of the engine                |
| `packages/db/src/repositories/submission-repository.ts` | Claiming, saving results, batch lookup |
| `packages/db/src/seed-data.ts`                          | Languages and sample problems          |
| `apps/api/src/auth.ts`                                  | Better Auth on the Drizzle adapter     |

[IMPLEMENTATION](IMPLEMENTATION.md) · [ARCHITECTURE](ARCHITECTURE.md) ·
[TESTING](TESTING.md) · [PR_REVIEW](PR_REVIEW.md) · [REBUILD_PROMPT](REBUILD_PROMPT.md)

**Next:** Chapter 3, language runtime images.
