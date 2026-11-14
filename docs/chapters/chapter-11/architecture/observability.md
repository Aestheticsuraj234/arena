# Observability (Chapter 11)

```mermaid
flowchart LR
  subgraph API["apps/api"]
    MW["observe() middleware<br/>X-Request-Id · access log · HTTP metrics"]
    SS["SubmissionService<br/>submissions_created_total"]
    M1["GET /metrics<br/>(optional bearer token)"]
    RD["GET /ready<br/>database + Redis"]
  end
  subgraph Worker["apps/worker"]
    HK["processor hooks<br/>onStart · onFinish · onError"]
    OPS["ops server :9465<br/>/metrics · /health (Redis + Docker)"]
  end
  P[("Prometheus<br/>scrape 15 s<br/>alerts.yml")]
  G["Grafana<br/>Arena overview<br/>(provisioned)"]
  L["stdout JSON logs<br/>(pino)"]
  M1 --> P
  OPS --> P
  P --> G
  MW --> L
  HK --> L
```

## Metrics

| Metric                                | Type      | Labels                | From   |
| ------------------------------------- | --------- | --------------------- | ------ |
| `arena_http_requests_total`           | counter   | method, route, status | API    |
| `arena_http_request_duration_seconds` | histogram | method, route         | API    |
| `arena_submissions_created_total`     | counter   | language, source      | API    |
| `arena_queue_depth`                   | gauge     | –                     | API    |
| `arena_submissions_processed_total`   | counter   | language, status      | worker |
| `arena_execution_duration_seconds`    | histogram | language              | worker |
| `arena_active_executions`             | gauge     | –                     | worker |
| `arena_execution_failures_total`      | counter   | final                 | worker |
| `arena_process_*`, `arena_nodejs_*`   | default   | service               | both   |
