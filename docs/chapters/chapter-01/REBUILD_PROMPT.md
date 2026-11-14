# Chapter 1: Rebuild prompt

Paste this into a coding agent in an empty folder to rebuild this chapter.

---

Build Chapter 1 of "Arena", a self-hosted remote code execution engine, in
TypeScript.

**Monorepo:** Turborepo + pnpm 10, Node 22. Workspaces `apps/*` and
`packages/*`. Root scripts `dev`, `build`, `lint`, `typecheck`, `test`,
`format`, `format:check`, `db:migrate`, `setup`. TypeScript `~6.0.3`, ESLint 10
flat config with typescript-eslint (no `any`, consistent type imports, eqeqeq),
Prettier (single quotes, trailing commas, width 100, no bracket spacing).

**packages/tsconfig:** strict `base.json` (`noUncheckedIndexedAccess`,
`verbatimModuleSyntax`, `moduleResolution: Bundler`) and `node.json`.

**packages/shared:** source-only package exporting zod 4 schemas
`signUpSchema` (name, email, password 8–128) and `signInSchema`. Email is
trimmed and lowercased _before_ `z.email()`. Also `PublicUser` and
`HealthResponse` types. Vitest tests for the schemas.

**apps/api:** Hono 4 on `@hono/node-server`. `loadEnv()` validates env with zod.
`createAuth(env, pool)` builds Better Auth (email + password, `pg` Pool,
basePath `/api/auth`, trustedOrigins `[WEB_URL]`, 7-day sessions).
`createApp({env, pool, auth})` adds logger (not in tests), CORS with
credentials, the Better Auth handler, `GET /health` (503 when the DB is down),
`loadSession` on `/v1/*`, `GET /v1/me` behind `requireUser`, a JSON 404, and an
`onError` that maps `AppError` subclasses (`UnauthorizedError`,
`NotFoundError`) to `{error: {code, message}}`. `scripts/migrate.ts` uses
`getMigrations` from `better-auth/db/migration`. Build with tsup, bundling
`@arena/*`. Vitest tests use `app.request()` against real Postgres.

**apps/web:** Next.js 16 app router, Tailwind 4, Geist fonts, dark tokens in
`@theme`. UI: Button (cva variants), Input, Label, Card, Logo (`>_ arena`).
One `AuthForm` for sign-in and sign-up, validated with the shared schemas,
per-field errors with `aria-invalid`. `src/proxy.ts` redirects with
`getSessionCookie`. Dashboard uses `authClient.useSession()` and shows three
"coming in chapter N" cards plus sign-out.

**Also:** `docker-compose.yml` (Postgres 16, Redis 7), `.env.example`, and a
GitHub Actions workflow running format:check, lint, typecheck, test and build
with a Postgres service.
