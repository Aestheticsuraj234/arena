# Arena

A self-hosted remote code execution engine. Send code, it runs in an isolated
Docker container, and you get back the output, verdict, time and memory.
Judge0-compatible API, LeetCode-style test cases, and a Monaco playground.

Built chapter by chapter for the [@codebysuraj](https://youtube.com/@codebysuraj)
YouTube series. See [docs/CHAPTERS.md](docs/CHAPTERS.md) for the plan and
`docs/chapters/` for each chapter's docs.

## Quick start

Requirements: Node 22+, pnpm 10, Docker.

```bash
cp .env.example .env    # set BETTER_AUTH_SECRET: openssl rand -base64 32
docker compose up -d    # Postgres + Redis
pnpm install
pnpm db:migrate
pnpm dev                # API http://localhost:4000, web http://localhost:3000
```

## Scripts

| Command          | What it does                       |
| ---------------- | ---------------------------------- |
| `pnpm dev`       | API and web in watch mode          |
| `pnpm test`      | All tests (needs Postgres running) |
| `pnpm lint`      | ESLint in every package            |
| `pnpm typecheck` | `tsc` in every package             |
| `pnpm build`     | Production builds                  |
| `pnpm format`    | Prettier                           |

## Stack

TypeScript · Turborepo + pnpm · Hono · Better Auth · Postgres · Next.js 16 ·
Tailwind 4. Later chapters add Drizzle, Redis + BullMQ, dockerode, Monaco,
Prometheus and Grafana.

Reference: [CodeBox](https://github.com/hiteshchoudhary/Codebox) (MIT).
