/**
 * "I tried to hack my own code runner." Each test is an attack a submission
 * might try, and the outcome the sandbox must force. Needs Docker + images.
 */
import Docker from 'dockerode';
import {describe, expect, it} from 'vitest';

import {
  createDefaultRegistry,
  DEFAULT_LIMITS,
  DockerExecutor,
  type ExecutionLimits,
  type RunOutcome,
} from '../../src';

const executor = new DockerExecutor(createDefaultRegistry());
const PY = 71;
const C = 50;

async function attack(
  languageId: number,
  sourceCode: string,
  inputs = [''],
  limits: Partial<ExecutionLimits> = {},
): Promise<RunOutcome[]> {
  const result = await executor.execute({
    languageId,
    sourceCode,
    inputs,
    limits: {...DEFAULT_LIMITS, timeLimitMs: 1000, ...limits},
  });
  if (result.compile && !result.compile.success) throw new Error(result.compile.output);
  return result.runs;
}

describe('sandbox: identity and privileges', () => {
  it('runs as nobody, not root', async () => {
    const [run] = await attack(PY, 'import os; print(os.getuid(), os.getgid())');
    expect(run?.stdout).toBe('65534 65534\n');
  });

  it('has no capabilities', async () => {
    const [run] = await attack(PY, 'print(open("/proc/self/status").read())');
    expect(run?.stdout).toMatch(/CapEff:\s+0000000000000000/);
    expect(run?.stdout).toMatch(/NoNewPrivs:\s+1/);
  });

  it('cannot kill PID 1 to tear down the sandbox', async () => {
    // The kernel ignores SIGKILL sent to a namespace's init from inside it.
    const src = [
      'import os, signal, sys',
      'if sys.stdin.read() == "kill":',
      '    os.kill(1, signal.SIGKILL)',
      'print("alive")',
    ].join('\n');
    const runs = await attack(PY, src, ['kill', 'check']);
    expect(runs.map((r) => [r.status, r.stdout])).toEqual([
      ['ok', 'alive\n'],
      ['ok', 'alive\n'],
    ]);
  });

  it('cannot see the Docker socket', async () => {
    const [run] = await attack(PY, 'import os; print(os.path.exists("/var/run/docker.sock"))');
    expect(run?.stdout).toBe('False\n');
  });
});

describe('sandbox: filesystem', () => {
  it('cannot write outside /box and /tmp', async () => {
    const [run] = await attack(PY, 'open("/etc/hacked", "w").write("x")');
    expect(run?.status).toBe('runtime_error');
    expect(run?.stderr).toMatch(/Read-only file system|Permission denied/);
  });

  it('cannot fill the disk', async () => {
    const src = 'with open("/tmp/big", "wb") as f:\n    while True: f.write(b"x" * 1048576)';
    const [run] = await attack(PY, src, [''], {timeLimitMs: 5000});
    expect(run?.status).toBe('runtime_error');
    expect(run?.stderr).toMatch(/No space left|File too large/);
  });
});

describe('sandbox: network', () => {
  it('has no network', async () => {
    const src = 'import socket\nsocket.create_connection(("1.1.1.1", 80), timeout=2)';
    const [run] = await attack(PY, src);
    expect(run?.status).toBe('runtime_error');
    expect(run?.stderr).toMatch(/Network is unreachable|OSError/);
  });

  it('cannot resolve DNS', async () => {
    const [run] = await attack(PY, 'import socket; socket.gethostbyname("example.com")');
    expect(run?.status).toBe('runtime_error');
  });
});

describe('sandbox: resource exhaustion', () => {
  it('survives a fork bomb', async () => {
    const src = '#include <unistd.h>\nint main(void){ while(1) fork(); }';
    const started = Date.now();
    const [run] = await attack(C, src);
    expect(run?.status).not.toBe('ok');
    expect(Date.now() - started).toBeLessThan(15_000);
  });

  it('stops a program that prints forever with output limit exceeded, fast', async () => {
    const started = Date.now();
    const [run] = await attack(PY, 'while True:\n    print("spam" * 100)', [''], {
      timeLimitMs: 5000,
    });
    expect(run?.status).toBe('output_limit_exceeded');
    expect(run?.stdout.length).toBe(DEFAULT_LIMITS.outputLimitBytes);
    expect(Date.now() - started).toBeLessThan(5000);
  });

  it('caps memory even with a tiny limit', async () => {
    const src = 'x = []\nwhile True:\n    x.append(bytearray(1024 * 1024))';
    // A generous time limit keeps this test about memory: OOM kills can be
    // slow on cgroup v1 hosts.
    const [run] = await attack(PY, src, [''], {memoryLimitKb: 32_768, timeLimitMs: 5000});
    expect(run?.status).toBe('memory_limit_exceeded');
    // Killed near the tightened cap, far below the 512 MB compile floor.
    expect(run?.memoryKb).toBeLessThan(2 * 32_768);
  });

  it('does not wait for a background child that holds stdout open', async () => {
    const src = 'import os, time\nif os.fork() == 0:\n    time.sleep(60)\nprint("parent done")';
    const started = Date.now();
    const [run] = await attack(PY, src);
    expect(run).toMatchObject({status: 'ok', stdout: 'parent done\n'});
    expect(Date.now() - started).toBeLessThan(5000);
  });
});

describe('sandbox: isolation between runs', () => {
  it('kills leftover processes before the next input', async () => {
    const src = [
      'import os, subprocess, sys',
      'if sys.stdin.read().strip() == "1":',
      '    subprocess.Popen(["sleep", "60"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)',
      '    print("started")',
      'else:',
      '    alive = [p for p in os.listdir("/proc") if p.isdigit() and',
      '             b"sleep\\x0060" in open(f"/proc/{p}/cmdline", "rb").read()]',
      '    print("leftovers", len(alive))',
    ].join('\n');
    const runs = await attack(PY, src, ['1', '2']);
    expect(runs.map((r) => r.stdout)).toEqual(['started\n', 'leftovers 0\n']);
  });

  it('labels sandboxes and leaves none behind after an attack run', async () => {
    const docker = new Docker();
    await attack(PY, 'print(1)');
    const left = await docker.listContainers({all: true, filters: {label: ['arena.sandbox=true']}});
    expect(left).toHaveLength(0);
  });
});
