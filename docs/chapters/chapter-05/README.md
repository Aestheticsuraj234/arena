# Chapter 5: Sandbox hardening

**Goal:** assume every submission is hostile. Write the attacks first, watch
them succeed against Chapter 4's executor, then close each one.

## What you get

- `SandboxPolicy` + `hostConfigFor()`: every restriction in one reviewed place
- Non-root user, no capabilities, `no-new-privileges`, read-only root FS
- Size-limited `nosuid,nodev` tmpfs for `/box` and `/tmp`; `fsize`, `nofile`, `core` ulimits
- No network, no IPC namespace sharing, process limit of 128
- Memory cap tightened to the user's limit right after compiling
- Output overflow stops the program at once (`output_limit_exceeded`)
- Leftover processes are killed between test inputs
- `arena.sandbox=true` label on every container
- 14 attack tests in `test/docker/sandbox.test.ts`

## Before and after (same 14 attacks)

| Attack                                | Chapter 4             | Chapter 5                          |
| ------------------------------------- | --------------------- | ---------------------------------- |
| Check the user ID                     | ❌ root (0)           | ✅ nobody (65534)                  |
| Read capabilities                     | ❌ default set        | ✅ none, NoNewPrivs = 1            |
| Kill PID 1                            | ⚠️ allowed as root    | ✅ ignored, sandbox keeps working  |
| See the Docker socket                 | ✅ absent             | ✅ absent                          |
| Write `/etc/hacked`                   | ❌ succeeded          | ✅ read-only file system           |
| Fill the disk                         | ❌ internal error     | ✅ "No space left" → runtime error |
| Open a socket / resolve DNS           | ✅ no network         | ✅ no network                      |
| Fork bomb                             | ❌ took 48 s          | ✅ stopped in 3 s                  |
| Print forever                         | ❌ TLE after 8 s      | ✅ OLE in < 1 s                    |
| 32 MB limit, allocate in a loop       | ❌ TLE (512 MB floor) | ✅ MLE                             |
| Background child holds stdout         | ✅ finished           | ✅ finished in < 5 s               |
| Process from input 1 alive in input 2 | ❌ still running      | ✅ killed between runs             |
| Containers left behind                | ✅ none               | ✅ none                            |

## Run the attacks

```bash
pnpm images:build
pnpm test:docker
```

[IMPLEMENTATION](IMPLEMENTATION.md) · [ARCHITECTURE](ARCHITECTURE.md) ·
[TESTING](TESTING.md) · [PR_REVIEW](PR_REVIEW.md) · [REBUILD_PROMPT](REBUILD_PROMPT.md)

**Next:** Chapter 6, job queue and workers.
