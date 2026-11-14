# Chapter 12: Review and final integration review

## Chapter 12 findings

| #   | Finding                                                             | Fix                                              |
| --- | ------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | API crash-looped: `METRICS_TOKEN=""` from Compose failed validation | Empty optional env vars count as unset (+ tests) |
| 2   | API image 1.28 GB (Next.js via Better Auth's optional peers)        | `autoInstallPeers: false` → 530 MB               |
| 3   | Vitest silently relied on an auto-installed `vite` peer             | `vite` declared at the root                      |
| 4   | Judge0 `/submissions` collides with the web page                    | Two hostnames + `COOKIE_DOMAIN`                  |
| 5   | Secure cookies would break plain-HTTP (IP) installs                 | Secure only when `API_URL` is HTTPS              |
| 6   | SSE could be buffered by the proxy                                  | `flush_interval -1` in Caddy                     |
| 7   | `/metrics` would be public through Caddy                            | Blocked at Caddy; optional token on the API      |

## Whole-project review

| Area           | Check                                                                            | Status |
| -------------- | -------------------------------------------------------------------------------- | ------ |
| Types          | `strict`, `noUncheckedIndexedAccess`; no `any`; no non-null assertions in source | ✅     |
| Errors         | `AppError` hierarchy; Judge0 422 shape; no stack traces to clients               | ✅     |
| Secrets        | env only; keys hashed; logs redact cookies and keys                              | ✅     |
| Sandbox        | 14 attack tests in CI (`docker` job)                                             | ✅     |
| Data integrity | claim and save guarded by status; verdicts never overwritten                     | ✅     |
| Observability  | metrics, alerts, dashboard, request IDs                                          | ✅     |
| Docs           | 12 chapters × 6 docs + diagrams; README; deployment; architecture                | ✅     |

## Known limitations (follow-ups)

- Images still carry some build tooling pulled in by `pnpm deploy --legacy`
  (≈ 40 MB); a custom production `package.json` could trim it.
- Sandbox isolation is a container boundary; the bonus chapter adds VMs.
- One Redis and one Postgres; for high availability use managed services.
- The web app is client-rendered; pages show "Loading…" briefly.
