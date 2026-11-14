# Chapter 1: Architecture

Diagrams: [system overview](architecture/system-overview.md) ·
[request flow and middleware order](architecture/request-flow.md)

## Folder layout

```
arena/
├── apps/
│   ├── api/                 Hono API
│   │   ├── scripts/migrate.ts
│   │   ├── src/
│   │   │   ├── app.ts       createApp(): middleware + routes
│   │   │   ├── app-env.ts   typed context variables
│   │   │   ├── auth.ts      createAuth(): Better Auth
│   │   │   ├── env.ts       loadEnv(): zod-validated env
│   │   │   ├── index.ts     server entry, graceful shutdown
│   │   │   ├── lib/         db pool, AppError
│   │   │   ├── middleware/  loadSession, requireUser
│   │   │   └── routes/      health, me
│   │   └── test/
│   └── web/                 Next.js 16
│       └── src/
│           ├── app/         (auth)/sign-in, (auth)/sign-up, (app)/dashboard
│           ├── components/  ui/, auth/, logo
│           ├── lib/         auth-client, cn
│           └── proxy.ts
├── packages/
│   ├── shared/              zod schemas + response types
│   └── tsconfig/            base + node configs
└── docs/chapters/
```

## Patterns introduced

| Pattern                | Where                     | Why it matters later                                        |
| ---------------------- | ------------------------- | ----------------------------------------------------------- |
| Factory functions + DI | `createApp`, `createAuth` | Chapter 4 injects the `Executor`; tests swap in fakes       |
| Error hierarchy        | `AppError` and subclasses | Chapter 7 adds `RateLimitedError`, `ValidationError`        |
| Shared contract        | `packages/shared`         | Submission and verdict types are shared by API, worker, web |
| Fail-fast config       | `loadEnv()`               | The worker (Chapter 6) reuses the same approach             |

## Data model (Better Auth defaults)

| Table          | Purpose                                        |
| -------------- | ---------------------------------------------- |
| `user`         | id, name, email, emailVerified, timestamps     |
| `session`      | token, userId, expiresAt, ip, user agent       |
| `account`      | provider `credential` with the hashed password |
| `verification` | tokens for email verification and resets       |
