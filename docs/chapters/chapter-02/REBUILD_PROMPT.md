# Chapter 2: Rebuild prompt

Starting from Chapter 1, add `packages/db` (Drizzle ORM 0.45 on `pg`, drizzle-kit,
`casing: 'snake_case'`).

Schema: Better Auth tables `user`, `session`, `account`, `verification`;
`languages` (integer PK = Judge0 ID, slug, name, version, is_active);
`problems` (uuid, slug, title, description, `difficulty` enum, time/memory
limits) and `test_cases` (position, input, expected_output, is_sample);
`api_keys` (user, name, prefix, unique sha256 hash, last_used_at, revoked_at);
`batches`; `submissions` (uuid id, unique uuid token, user, api key, batch,
problem, language, source, stdin, expected output, limits, `submission_status`
enum with in_queue, processing, accepted, wrong_answer, time_limit_exceeded,
memory_limit_exceeded, output_limit_exceeded, compilation_error, runtime_error,
internal_error, plus stdout, stderr, compile_output, message, exit_code,
time_ms, memory_kb, timestamps); `test_results`.

`createDb(url)` returns `{db, pool}`. Repositories: `LanguageRepository`
(listActive, findById, upsertMany), `ProblemRepository` (list, findBySlug with
ordered tests, transactional upsert that replaces tests), `SubmissionRepository`
(create, createMany, findById, findByToken, findByTokens in order, listByUser,
`markProcessing` as a conditional update on `status = 'in_queue'`, saveResult,
test results). Seed 6 languages (50 C, 54 C++, 62 Java, 63 JavaScript,
71 Python, 74 TypeScript) and 3 problems. Switch Better Auth to
`drizzleAdapter`. In Turbo, make `test` depend on `@arena/db#db:migrate`. In the
API's tsup config, bundle only `@arena/*`.
