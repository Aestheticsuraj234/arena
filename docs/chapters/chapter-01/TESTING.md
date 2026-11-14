# Chapter 1: Testing

## Automated

| Package         | Tests | What they cover                                                                                         |
| --------------- | ----- | ------------------------------------------------------------------------------------------------------- |
| `@arena/shared` | 4     | email normalization, short password, invalid email, empty sign-in password                              |
| `@arena/api`    | 7     | `/health` (200 and 503), sign-up cookie, wrong password 401, sign-in + `/v1/me`, `/v1/me` 401, JSON 404 |

API tests run against a real Postgres (`pnpm test` runs the migration first).
They call `app.request()` directly, so no port is opened.

```
pnpm format:check   ✅
pnpm lint           ✅ 3/3 packages
pnpm typecheck      ✅ 3/3 packages
pnpm test           ✅ 11 tests
pnpm build          ✅ api (tsup) + web (next build)
```

## Browser (headless Chromium, production build)

| Check                                                   | Result |
| ------------------------------------------------------- | ------ |
| Signed-out `/dashboard` redirects to `/sign-in`         | ✅     |
| Empty sign-up shows three field errors, no request sent | ✅     |
| Sign-up with `" NAME@TEST.DEV "` lands on the dashboard | ✅     |
| Sign-out returns to `/sign-in`                          | ✅     |
| Wrong password shows "Invalid email or password"        | ✅     |
| Sign-in with the lowercase email works                  | ✅     |
| Signed-in `/sign-in` redirects to `/dashboard`          | ✅     |

Screenshots are in [screenshots/](screenshots/).

## Not tested yet

- Rate limiting on sign-in (Better Auth enables it in production only)
- Session expiry after 7 days
- Mobile layouts below 360px
