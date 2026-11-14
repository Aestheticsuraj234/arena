# Chapter 2: Review

Against the Google TypeScript Style Guide.

| #   | Finding                                                         | Fix                                                      |
| --- | --------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | Test used non-null assertions (`a!.token`)                      | Explicit guard that throws a readable error              |
| 2   | API bundle included CommonJS `pg` and crashed at start          | esbuild plugin keeps non-`@arena/*` imports external     |
| 3   | API still depended on `pg` directly after the move              | `pg` and `drizzle-orm` listed as runtime deps of the API |
| 4   | Tests in two packages could migrate a fresh DB at the same time | `test` depends on `@arena/db#db:migrate` in `turbo.json` |

Checked: no `any`; all repository methods return typed rows; `upsert` runs in a
transaction; every foreign key has an explicit `onDelete`.
