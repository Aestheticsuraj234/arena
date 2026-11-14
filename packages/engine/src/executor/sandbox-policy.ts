import type Docker from 'dockerode';

/**
 * Everything the container is allowed to do, in one place. Each field closes a
 * specific attack; the attack tests in `test/docker/sandbox.test.ts` prove it.
 */
export interface SandboxPolicy {
  /** Unprivileged user (`nobody`). Blocks writes to system files. */
  user: string;
  /** Max processes and threads. Stops fork bombs. Java needs ~30 threads. */
  pidsLimit: number;
  /** Size of the writable `/box` and `/tmp` tmpfs mounts. Stops disk filling. */
  tmpfsSizeMb: number;
  /** Max open files. */
  maxOpenFiles: number;
  /** Largest file a program may write, in bytes. */
  maxFileSizeBytes: number;
  /** CPUs per container. */
  cpus: number;
}

export const DEFAULT_SANDBOX_POLICY: SandboxPolicy = {
  user: '65534:65534',
  pidsLimit: 128,
  tmpfsSizeMb: 64,
  maxOpenFiles: 256,
  maxFileSizeBytes: 16 * 1024 * 1024,
  cpus: 1,
};

/** Docker `HostConfig` for a sandbox with the given memory cap. */
export function hostConfigFor(policy: SandboxPolicy, memoryBytes: number): Docker.HostConfig {
  const tmpfs = `rw,exec,nosuid,nodev,size=${policy.tmpfsSizeMb}m,mode=1777`;
  return {
    NetworkMode: 'none',
    ReadonlyRootfs: true,
    Tmpfs: {'/box': tmpfs, '/tmp': tmpfs},
    Memory: memoryBytes,
    MemorySwap: memoryBytes, // no swap: memory limits stay real
    NanoCpus: Math.round(policy.cpus * 1e9),
    PidsLimit: policy.pidsLimit,
    CapDrop: ['ALL'],
    SecurityOpt: ['no-new-privileges'],
    IpcMode: 'none',
    Ulimits: [
      {Name: 'nofile', Soft: policy.maxOpenFiles, Hard: policy.maxOpenFiles},
      {Name: 'fsize', Soft: policy.maxFileSizeBytes, Hard: policy.maxFileSizeBytes},
      {Name: 'core', Soft: 0, Hard: 0},
    ],
    OomScoreAdj: 1000, // if the host runs low, the sandbox dies first
    Privileged: false,
  };
}
