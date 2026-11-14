# Chapter 1: Implementation notes

## Plan and acceptance criteria

| #   | Criterion                                                           | Result |
| --- | ------------------------------------------------------------------- | ------ |
| 1   | `pnpm install && pnpm dev` starts the API (:4000) and web (:3000)   | ✅     |
| 2   | Sign up with name, email and password creates a user and a session  | ✅     |
| 3   | Sign in with the right password works; a wrong one shows an error   | ✅     |
| 4   | `GET /v1/me` returns the user with a cookie, 401 JSON without one   | ✅     |
| 5   | Signed-out visitors are sent to `/sign-in`; signed-in ones skip it  | ✅     |
| 6   | Form errors appear per field before any request is sent             | ✅     |
| 7   | `/health` reports database status (503 when Postgres is down)       | ✅     |
| 8   | format, lint, typecheck, test and build all pass, locally and in CI | ✅     |

## Steps, in recording order

1. **Root config.** `package.json` scripts call `turbo run …`. `pnpm-workspace.yaml`
   lists `apps/*` and `packages/*`. `turbo.json` makes `build` depend on
   dependencies' builds.
2. **`packages/tsconfig`.** One strict base (`noUncheckedIndexedAccess`,
   `verbatimModuleSyntax`) and a Node variant. Every package extends it.
3. **`packages/shared`.** Ships TypeScript source (no build step). The API
   bundles it with tsup; Next.js compiles it via `transpilePackages`.
4. **API env.** `loadEnv()` validates `process.env` with zod and fails fast with
   a list of every bad variable.
5. **Better Auth.** `createAuth(env, pool)` passes the `pg` pool directly.
   `scripts/migrate.ts` uses `getMigrations` to create the four auth tables.
6. **App factory.** `createApp({env, pool, auth})` returns the Hono app without
   calling `listen()`, so tests use `app.request()` with no ports.
7. **Errors.** Routes throw `AppError` subclasses; `onError` turns them into
   `{error: {code, message}}`. Anything else is logged and becomes a 500.
8. **Web.** `authClient` from `better-auth/react`, one `AuthForm` for both
   modes, `proxy.ts` for redirects, client-side `useSession` on the dashboard.
9. **CI.** Same five commands as local, with a Postgres service container.

## Decisions

- **Hono, not Express.** Web-standard `Request`/`Response`, so Better Auth's
  handler plugs in with one line, and testing needs no HTTP server.
- **Auth lives in the API, not in Next.js.** The API is the product; the web app
  is one client. Later, API keys (Chapter 7) sit next to sessions.
- **TypeScript 6.0, not 7.** typescript-eslint supports `<6.1`.
- **No Drizzle yet.** Chapter 2 introduces the ORM and takes over the auth tables.
- **`proxy.ts`, not `middleware.ts`.** Next.js 16 renamed the file.
- **Cookie check in the proxy is only a shortcut.** The API checks the real
  session on every `/v1/*` request.

## Bug caught by tests

The first email schema was `z.email().trim().toLowerCase()`. zod validates
before transforming, so `" A@B.co "` failed. Fixed by trimming first and piping
into `z.email()`.
