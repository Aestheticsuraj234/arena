# Deploying Arena

## What you need

- A Linux host (VPS or bare metal) with Docker Engine and Compose v2
- Ideally a dedicated host: the worker controls Docker (see Security)
- A domain with two DNS A records pointing at the host: `arena.example.com`
  and `api.arena.example.com`, and ports 80 and 443 open

| Load             | Size          | `WORKER_CONCURRENCY` |
| ---------------- | ------------- | -------------------- |
| Personal / demo  | 2 vCPU, 4 GB  | 2                    |
| Class or contest | 4 vCPU, 8 GB  | 4                    |
| Heavy            | 8 vCPU, 16 GB | 8                    |

Each running submission gets one CPU, so concurrency should not exceed the
vCPU count. Measured on 2 vCPU: about 2 submissions per second.

## One command

```bash
git clone <your fork> arena && cd arena
./scripts/setup-production.sh arena.example.com
```

It writes `.env.production` with random secrets, builds the sandbox runtime
images, builds and starts the stack, and waits for the API. Without a domain
(`./scripts/setup-production.sh`) it serves plain HTTP on the host's IP
(web on 80, API on 8080) for private networks.

## By hand

```bash
cp .env.production.example .env.production       # fill it in
./scripts/build-images.sh                         # sandbox images on this host
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## What runs

| Service    | Role                                                    | Exposed                   |
| ---------- | ------------------------------------------------------- | ------------------------- |
| caddy      | HTTPS (Let's Encrypt), routes web and API hostnames     | 80, 443 (8080 IP mode)    |
| web        | Next.js standalone server                               | via Caddy                 |
| api        | Hono API, Judge0 API, SSE                               | via Caddy (no `/metrics`) |
| worker     | Runs submissions in sandboxes through the Docker socket | no                        |
| setup-db   | Migrations + languages (+ samples), then exits          | no                        |
| postgres   | Data                                                    | no                        |
| redis      | Queue, rate limits, live events (AOF on)                | no                        |
| prometheus | Scrapes API and worker, evaluates alerts                | no                        |
| grafana    | "Arena overview" dashboard                              | 127.0.0.1:3001            |

Grafana: `ssh -L 3001:localhost:3001 you@host`, then http://localhost:3001
(user `admin`, password in `.env.production`).

## Updating

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

`setup-db` runs migrations before the new API and worker start. Workers get
60 s to finish running submissions on shutdown. Restart all workers with the
API when the schema changes (an old worker writing to a new schema is the
classic deploy bug; Chapter 7 hit it).

## Scaling

- More throughput on one host: raise `WORKER_CONCURRENCY` up to the CPU count.
- More hosts: run only the `worker` service on extra machines (each needs
  Docker, the runtime images and access to Postgres and Redis).
- The API is stateless; run several behind Caddy if needed.

## Security

- The worker mounts `/var/run/docker.sock`, which is equivalent to root on the
  host. Run Arena on its own host or VM, or use rootless Docker.
- Sandboxes: no network, read-only root, non-root user, no capabilities,
  limits on memory, CPU, processes, files and output (Chapter 5).
- Harden the host: SSH keys only, a firewall allowing 22/80/443, automatic
  security updates.
- Keep `.env.production` private (`chmod 600`, never committed).
- Set `METRICS_TOKEN` if the API's internal port is reachable by anyone else.

## Backups

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U arena arena | gzip > arena-$(date +%F).sql.gz
```

## Troubleshooting

| Symptom                                | Check                                                                 |
| -------------------------------------- | --------------------------------------------------------------------- |
| Every submission is `internal_error`   | `docker compose logs worker`; are runtime images built on this host?  |
| Submissions stay `in_queue`            | Is the worker running? Grafana "Queue depth"; `ArenaWorkerDown` alert |
| Signed in, but bounced back to sign-in | `COOKIE_DOMAIN` must be the parent of both hostnames                  |
| `docker pull` 429 during build         | `BASE_REGISTRY=public.ecr.aws/docker/library` in `.env.production`    |
| Images will not run on Apple Silicon   | Build locally with `./scripts/build-images.sh` (native arch)          |
