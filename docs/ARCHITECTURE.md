# Arena architecture

```mermaid
flowchart TB
  subgraph Clients
    BR["Browser<br/>Next.js app"]
    J0["Judge0 clients<br/>X-Auth-Token"]
  end
  CD["Caddy<br/>HTTPS · two hostnames"]
  subgraph App["Application"]
    WEB["apps/web<br/>Next.js 16 · Monaco"]
    API["apps/api<br/>Hono · Better Auth · Judge0 API · SSE"]
    WK["apps/worker × N<br/>BullMQ consumer"]
  end
  subgraph Data
    PG[("Postgres<br/>users · submissions · problems · API keys")]
    RD[("Redis<br/>queue · rate limits · pub/sub")]
  end
  subgraph Sandbox["Docker on the worker host"]
    C1["arena-runtime-* container<br/>one per submission"]
  end
  subgraph Ops
    PR["Prometheus + alerts"]
    GF["Grafana"]
  end

  BR --> CD
  J0 --> CD
  CD --> WEB
  CD --> API
  BR -. "fetch / EventSource" .-> API
  API --> PG
  API -- "enqueue · rate limit · subscribe" --> RD
  WK -- "consume · publish events" --> RD
  WK --> PG
  WK -- "create · exec · remove" --> C1
  PR -- "/metrics" --> API
  PR -- ":9465/metrics" --> WK
  GF --> PR
```

## Packages

```mermaid
flowchart LR
  shared["@arena/shared<br/>zod schemas · types · limits"]
  db["@arena/db<br/>Drizzle schema · repositories · state machine"]
  engine["@arena/engine<br/>runners · DockerExecutor · sandbox · judge"]
  queue["@arena/queue<br/>BullMQ · processor · events"]
  tel["@arena/telemetry<br/>pino · prom-client"]
  api["apps/api"]
  worker["apps/worker"]
  web["apps/web"]

  engine --> shared
  queue --> db & engine & shared
  api --> db & engine & queue & shared & tel
  worker --> db & engine & queue & tel
  web --> shared
```

## Life of a submission

1. **Create.** The API validates the body (zod), checks the language, writes a
   `submissions` row (`in_queue`) and adds a BullMQ job whose ID is the
   submission ID.
2. **Claim.** A worker takes the job and moves the row to `processing` with a
   conditional update, so no submission runs twice.
3. **Execute.** `DockerExecutor` starts a locked-down container, writes the
   source, compiles once, lowers the memory cap, runs each input with
   `docker exec` under `timeout` and GNU `time`, and removes the container.
4. **Judge.** `classifyRun` turns exit code, signal, time and memory into a run
   status; `judgeTests` compares outputs and stops at the first failure.
5. **Save and notify.** The verdict is saved (only from `processing`), per-test
   results are stored, and `status`/`test`/`done` events go out over Redis
   pub/sub to every API instance and on to browsers over SSE.

## Key decisions

| Decision                                      | Why                                                         |
| --------------------------------------------- | ----------------------------------------------------------- |
| Postgres is the source of truth               | Redis only carries IDs and events; losing it loses no data  |
| One container per submission, `exec` per test | Compile once; isolation between submissions                 |
| GNU `time` in every image                     | Same memory measurement on cgroup v1 and v2 hosts           |
| Judge0 language IDs and status table          | Existing Judge0 clients work unchanged                      |
| SSE + Redis pub/sub                           | One-way updates over plain HTTP, fan-out to every API       |
| Two hostnames                                 | Judge0's `/submissions` would clash with the web page       |
| Everything injected (`createApp(deps)`)       | Tests swap Docker, Redis and Prometheus for in-memory fakes |

Per-chapter details: [docs/chapters/](chapters/).
