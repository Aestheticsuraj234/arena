import Docker from 'dockerode';

import type {LanguageRegistry} from '../languages/language-registry';
import type {LanguageRunner} from '../languages/language-runner';
import {classifyRun, parseTimeOutput, signalName} from './classify';
import type {Executor} from './executor';
import {OutputCollector} from './output-collector';
import type {
  CompileOutcome,
  ExecutionJob,
  ExecutionLimits,
  ExecutionResult,
  RunOutcome,
} from './types';

export interface DockerExecutorOptions {
  docker?: Docker;
  /** Compile time limit; compilers are slow but must not hang forever. */
  compileTimeLimitMs?: number;
  /** Memory floor for the container, so compilers fit even with tiny limits. */
  minContainerMemoryKb?: number;
}

interface ExecResult {
  exitCode: number | null;
  stdout: OutputCollector;
  stderr: OutputCollector;
  wallMs: number;
}

const WORKDIR = '/box';
const META_FILE = '/tmp/.arena-meta';
/** Extra time `docker exec` itself may take before we give up on it. */
const EXEC_GRACE_MS = 5000;

/** Wall-clock deadline for a run: room for I/O waits, still bounded. */
export function wallLimitFor(timeLimitMs: number): number {
  return Math.round(timeLimitMs * 1.5) + 500;
}

/**
 * Runs each job in a fresh container: start it idle, copy the source in,
 * compile once, then `docker exec` one run per input, and always remove it.
 */
export class DockerExecutor implements Executor {
  private readonly docker: Docker;
  private readonly compileTimeLimitMs: number;
  private readonly minContainerMemoryKb: number;

  constructor(
    private readonly registry: LanguageRegistry,
    options: DockerExecutorOptions = {},
  ) {
    this.docker = options.docker ?? new Docker();
    this.compileTimeLimitMs = options.compileTimeLimitMs ?? 15_000;
    this.minContainerMemoryKb = options.minContainerMemoryKb ?? 524_288;
  }

  async execute(job: ExecutionJob): Promise<ExecutionResult> {
    const runner = this.registry.get(job.languageId);
    const container = await this.createContainer(runner, job.limits);
    try {
      await container.start();
      await this.writeSource(container, runner, job.sourceCode);

      let compile: CompileOutcome | null = null;
      const compileCmd = runner.compileCommand();
      if (compileCmd) {
        compile = await this.compile(container, compileCmd);
        if (!compile.success) return {compile, runs: []};
      }

      const runs: RunOutcome[] = [];
      for (const input of job.inputs) {
        runs.push(await this.run(container, runner, input, job.limits));
      }
      return {compile, runs};
    } finally {
      await container.remove({force: true}).catch(() => undefined);
    }
  }

  /** Images the registry needs that are not present locally. */
  async missingImages(): Promise<string[]> {
    const present = new Set((await this.docker.listImages()).flatMap((img) => img.RepoTags ?? []));
    return this.registry.images().filter((image) => !present.has(image));
  }

  private async createContainer(runner: LanguageRunner, limits: ExecutionLimits) {
    const memoryKb = Math.max(
      limits.memoryLimitKb + runner.memoryOverheadKb,
      this.minContainerMemoryKb,
    );
    return this.docker.createContainer({
      Image: runner.image,
      Cmd: ['sleep', 'infinity'],
      WorkingDir: WORKDIR,
      Env: ['HOME=/tmp'],
      NetworkDisabled: true,
      HostConfig: {
        NetworkMode: 'none',
        Memory: memoryKb * 1024,
        MemorySwap: memoryKb * 1024,
        NanoCpus: 1_000_000_000,
        Tmpfs: {[WORKDIR]: 'rw,exec,size=64m,mode=1777', '/tmp': 'rw,exec,size=64m,mode=1777'},
      },
    });
  }

  private async writeSource(container: Docker.Container, runner: LanguageRunner, source: string) {
    const res = await this.exec(container, ['sh', '-c', 'cat > "$0"', runner.sourceFile], {
      stdin: source,
      outputLimitBytes: 4096,
      deadlineMs: 10_000,
    });
    if (res.exitCode !== 0) {
      throw new Error(`Could not write source: ${res.stderr.text() || 'unknown error'}`);
    }
  }

  private async compile(
    container: Docker.Container,
    cmd: readonly string[],
  ): Promise<CompileOutcome> {
    const seconds = this.compileTimeLimitMs / 1000;
    const res = await this.exec(container, ['timeout', '-s', 'KILL', `${seconds}`, ...cmd], {
      stdin: '',
      outputLimitBytes: 64 * 1024,
      deadlineMs: this.compileTimeLimitMs + EXEC_GRACE_MS,
    });
    const timedOut = res.exitCode === 137 && res.wallMs >= this.compileTimeLimitMs - 100;
    const output = [res.stdout.text(), res.stderr.text()].filter(Boolean).join('\n');
    return {
      success: res.exitCode === 0,
      output: timedOut ? `${output}\nCompilation timed out`.trim() : output,
      exitCode: res.exitCode,
      timeMs: res.wallMs,
    };
  }

  private async run(
    container: Docker.Container,
    runner: LanguageRunner,
    input: string,
    limits: ExecutionLimits,
  ): Promise<RunOutcome> {
    const wallLimitMs = wallLimitFor(limits.timeLimitMs);
    const cmd = [
      '/usr/bin/time',
      '-f',
      'ARENA_META %e %U %S %M',
      '-o',
      META_FILE,
      'timeout',
      '-s',
      'KILL',
      `${wallLimitMs / 1000}`,
      ...runner.runCommand(),
    ];
    const res = await this.exec(container, cmd, {
      stdin: input,
      outputLimitBytes: limits.outputLimitBytes,
      deadlineMs: wallLimitMs + EXEC_GRACE_MS,
    });
    const meta = await this.exec(container, ['cat', META_FILE], {
      stdin: '',
      outputLimitBytes: 4096,
      deadlineMs: 5000,
    });
    const parsed = parseTimeOutput(meta.stdout.text());
    if (!parsed) {
      return {
        status: 'internal_error',
        stdout: res.stdout.text(),
        stderr: res.stderr.text(),
        exitCode: res.exitCode,
        signal: null,
        timeMs: res.wallMs,
        memoryKb: 0,
        message: 'Could not read run statistics',
      };
    }

    const signal = parsed.signal;
    const exitCode = signal === null ? res.exitCode : null;
    const {status, message} = classifyRun(
      {
        exitCode,
        signal,
        wallMs: parsed.wallMs,
        cpuMs: parsed.cpuMs,
        memoryKb: parsed.memoryKb,
        outputTruncated: res.stdout.truncated || res.stderr.truncated,
      },
      {
        timeLimitMs: limits.timeLimitMs,
        wallLimitMs,
        memoryLimitKb: limits.memoryLimitKb + runner.memoryOverheadKb,
      },
    );
    return {
      status,
      stdout: res.stdout.text(),
      stderr: res.stderr.text(),
      // A timed-out program has no exit code of its own.
      exitCode: status === 'time_limit_exceeded' ? null : exitCode,
      signal: signalName(signal),
      timeMs:
        status === 'time_limit_exceeded' ? Math.max(parsed.cpuMs, parsed.wallMs) : parsed.cpuMs,
      memoryKb: parsed.memoryKb,
      message,
    };
  }

  /** Runs one command in the container, feeding stdin and capturing output. */
  private async exec(
    container: Docker.Container,
    cmd: readonly string[],
    opts: {stdin: string; outputLimitBytes: number; deadlineMs: number},
  ): Promise<ExecResult> {
    const exec = await container.exec({
      Cmd: [...cmd],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: WORKDIR,
    });
    const stream = await exec.start({hijack: true, stdin: true});
    const stdout = new OutputCollector(opts.outputLimitBytes);
    const stderr = new OutputCollector(opts.outputLimitBytes);
    this.docker.modem.demuxStream(stream, stdout, stderr);

    const started = performance.now();
    const finished = new Promise<void>((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('close', resolve);
      stream.on('error', reject);
    });
    stream.end(opts.stdin);

    let timer: NodeJS.Timeout | undefined;
    const deadline = new Promise<'deadline'>((resolve) => {
      timer = setTimeout(() => resolve('deadline'), opts.deadlineMs);
    });
    const outcome = await Promise.race([finished.then(() => 'done' as const), deadline]);
    clearTimeout(timer);
    const wallMs = Math.round(performance.now() - started);

    if (outcome === 'deadline') {
      // The in-container timeout should have fired; this is the backstop.
      stream.destroy();
      await container.kill().catch(() => undefined);
      return {exitCode: 137, stdout, stderr, wallMs};
    }
    const info = await exec.inspect();
    return {exitCode: info.ExitCode ?? null, stdout, stderr, wallMs};
  }
}
