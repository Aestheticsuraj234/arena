# Chapter 5: Architecture

Diagrams: [sandbox layers and lifecycle](architecture/sandbox-layers.md)

## Threat model

| Threat                     | Control                                         | Test                    |
| -------------------------- | ----------------------------------------------- | ----------------------- |
| Privilege escalation       | nobody, CapDrop ALL, no-new-privileges, seccomp | uid check, capabilities |
| Escape via Docker          | socket never mounted                            | socket check            |
| Tamper with the image      | read-only root FS                               | write `/etc`            |
| Exhaust host disk          | 64 MB tmpfs, `fsize` 16 MB                      | fill disk               |
| Exfiltrate / attack others | `NetworkMode: none`                             | socket, DNS             |
| Exhaust processes          | PidsLimit 128                                   | fork bomb               |
| Exhaust memory             | Memory = MemorySwap, tightened after compile    | tiny-limit allocation   |
| Exhaust CPU / time         | 1 CPU, `timeout -s KILL`, Node deadline         | Chapter 4 TLE tests     |
| Flood output / DB          | capped collectors + early kill                  | print forever           |
| Leak between test cases    | `kill -9 -1` between inputs                     | leftover `sleep`        |
| Leak between submissions   | new container per job, removed in `finally`     | label check             |
| Hurt the host under load   | `OomScoreAdj: 1000`                             | not automated           |

## Files

```
packages/engine/src/executor/
├── sandbox-policy.ts     SandboxPolicy, DEFAULT_SANDBOX_POLICY, hostConfigFor()
├── output-collector.ts   + onOverflow
└── docker-executor.ts    tightenMemory(), killUserProcesses(), hung handling
packages/engine/test/docker/sandbox.test.ts
```
