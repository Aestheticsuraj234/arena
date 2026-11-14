# Chapter 5: Rebuild prompt

Write `packages/engine/test/docker/sandbox.test.ts` first, with these attacks:
uid check, capabilities from `/proc/self/status`, kill PID 1 then run again,
Docker socket exists, write `/etc/hacked`, fill `/tmp`, TCP connect, DNS, C
fork bomb (< 15 s), print forever (OLE, < 5 s, stdout = output limit), 32 MB
limit with an allocation loop (MLE), background child holding stdout (fast
finish), leftover process between two inputs (killed), no labeled containers
left.

Then add `SandboxPolicy` (user 65534:65534, pidsLimit 128, tmpfs 64 MB,
nofile 256, fsize 16 MB, 1 CPU) and `hostConfigFor(policy, memoryBytes)`:
NetworkMode none, ReadonlyRootfs, tmpfs `/box` and `/tmp` with
`nosuid,nodev`, Memory = MemorySwap, PidsLimit, CapDrop ALL,
no-new-privileges, IpcMode none, ulimits (nofile, fsize, core 0),
OomScoreAdj 1000. Set `User` and the label `arena.sandbox=true` on the
container. After compiling, `container.update()` the memory to limit +
overhead + 16 MB. Give `OutputCollector` an `onOverflow` callback that runs
`sh -c 'kill -9 -1'` and return `output_limit_exceeded` directly. Run the same
kill between inputs. Treat a fired Node deadline as TLE and skip later inputs.
