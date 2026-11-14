# Data model (Chapter 2)

```mermaid
erDiagram
  user ||--o{ session : has
  user ||--o{ account : has
  user ||--o{ api_keys : owns
  user ||--o{ submissions : creates
  user ||--o{ batches : creates
  api_keys ||--o{ submissions : "authenticates"
  batches ||--o{ submissions : groups
  languages ||--o{ submissions : "runs in"
  problems ||--o{ test_cases : has
  problems ||--o{ submissions : "judged by"
  submissions ||--o{ test_results : produces
  test_cases ||--o{ test_results : "checked by"

  languages {
    int id PK "Judge0 ID"
    text slug UK
    text name
    text version
    bool is_active
  }
  submissions {
    uuid id PK
    uuid token UK "public ID"
    int language_id FK
    text source_code
    text stdin
    text expected_output
    int time_limit_ms
    int memory_limit_kb
    enum status
    text stdout
    text stderr
    text compile_output
    int exit_code
    int time_ms
    int memory_kb
  }
  problems {
    uuid id PK
    text slug UK
    text title
    enum difficulty
    int time_limit_ms
    int memory_limit_kb
  }
  test_cases {
    uuid id PK
    uuid problem_id FK
    int position
    text input
    text expected_output
    bool is_sample
  }
  test_results {
    uuid id PK
    uuid submission_id FK
    uuid test_case_id FK
    enum status
    int time_ms
    int memory_kb
  }
  api_keys {
    uuid id PK
    text user_id FK
    text prefix
    text hash UK "sha256"
    timestamp revoked_at
  }
```

`submission_status`: in_queue, processing, accepted, wrong_answer,
time_limit_exceeded, memory_limit_exceeded, output_limit_exceeded,
compilation_error, runtime_error, internal_error.
