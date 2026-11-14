/** DockerExecutor against real containers. Needs Docker and the runtime images. */
import {describe, expect, it} from 'vitest';

import {createDefaultRegistry, DEFAULT_LIMITS, DockerExecutor, type ExecutionJob} from '../../src';
import {HELLO} from '../fixtures/programs';

const registry = createDefaultRegistry();
const executor = new DockerExecutor(registry);

function job(languageId: number, sourceCode: string, inputs: string[] = ['']): ExecutionJob {
  return {languageId, sourceCode, inputs, limits: {...DEFAULT_LIMITS, timeLimitMs: 1000}};
}

describe('DockerExecutor: every language', () => {
  for (const runner of registry.list()) {
    it(`${runner.slug} prints hello`, async () => {
      const result = await executor.execute(
        job(runner.languageId, HELLO[runner.slug] ?? '', ['Arena']),
      );
      expect(result.compile?.success ?? true).toBe(true);
      expect(result.runs).toHaveLength(1);
      expect(result.runs[0]).toMatchObject({status: 'ok', stdout: 'Hello, Arena!\n', exitCode: 0});
      expect(result.runs[0]?.memoryKb).toBeGreaterThan(0);
    });
  }
});

describe('DockerExecutor: outcomes', () => {
  it('runs one container for many inputs', async () => {
    const result = await executor.execute(job(71, HELLO.python ?? '', ['a', 'b', 'c']));
    expect(result.runs.map((r) => r.stdout)).toEqual(['Hello, a!\n', 'Hello, b!\n', 'Hello, c!\n']);
  });

  it('reports a compilation error with the compiler output', async () => {
    const result = await executor.execute(job(50, 'int main( { return 0; }'));
    expect(result.compile?.success).toBe(false);
    expect(result.compile?.output).toMatch(/error/);
    expect(result.runs).toEqual([]);
  });

  it('treats a TypeScript type error as a compilation error', async () => {
    const result = await executor.execute(job(74, 'const n: number = "nope";'));
    expect(result.compile?.success).toBe(false);
    expect(result.compile?.output).toMatch(/TS2322/);
  });

  it('reports a runtime error with stderr and exit code', async () => {
    const result = await executor.execute(job(71, 'raise ValueError("boom")'));
    expect(result.runs[0]).toMatchObject({status: 'runtime_error', exitCode: 1});
    expect(result.runs[0]?.stderr).toMatch(/ValueError: boom/);
  });

  it('names the signal on a segfault', async () => {
    const result = await executor.execute(job(50, 'int main(void){ int *p = 0; return *p; }'));
    expect(result.runs[0]).toMatchObject({status: 'runtime_error', signal: 'SIGSEGV'});
  });

  it('stops an infinite loop with time limit exceeded', async () => {
    const result = await executor.execute(job(71, 'while True:\n    pass'));
    expect(result.runs[0]?.status).toBe('time_limit_exceeded');
  });

  it('stops a Java infinite loop without noise on stderr', async () => {
    const src = 'public class Main { public static void main(String[] a) { while (true) {} } }';
    const result = await executor.execute(job(62, src));
    expect(result.runs[0]).toMatchObject({status: 'time_limit_exceeded', exitCode: null});
    expect(result.compile?.output).toBe('');
  });

  it('catches sleeping past the wall clock as time limit exceeded', async () => {
    const result = await executor.execute(job(71, 'import time\ntime.sleep(10)'));
    expect(result.runs[0]?.status).toBe('time_limit_exceeded');
  });

  it('reports memory limit exceeded', async () => {
    const big = {...job(71, 'x = bytearray(400 * 1024 * 1024)\nx[::4096] = b"1" * len(x[::4096])')};
    big.limits = {...big.limits, memoryLimitKb: 65_536};
    const result = await executor.execute(big);
    expect(result.runs[0]?.status).toBe('memory_limit_exceeded');
  });

  it('measures CPU time for a busy program', async () => {
    const result = await executor.execute(job(71, 'sum(i*i for i in range(3_000_000))'));
    expect(result.runs[0]?.status).toBe('ok');
    expect(result.runs[0]?.timeMs).toBeGreaterThan(50);
  });

  it('removes its containers', async () => {
    const Docker = (await import('dockerode')).default;
    const before = (await new Docker().listContainers({all: true})).length;
    await executor.execute(job(71, 'print(1)'));
    const after = (await new Docker().listContainers({all: true})).length;
    expect(after).toBe(before);
  });
});
