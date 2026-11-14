import Docker from 'dockerode';

import type {LanguageRegistry} from '../languages/language-registry';
import type {LanguageRunner} from '../languages/language-runner';
import {classifyRun, parseTimeOutput, signalName} from './classify';
import type {Executor} from './executor';
import {OutputCollector} from './output-collector';
import {DEFAULT_SANDBOX_POLICY, hostConfigFor, type SandboxPolicy} from './sandbox-policy';
import type {
  CompileOutcome,
  ExecutionJob,
  ExecutionLimits,
  ExecutionResult,
  RunOutcome,
} from './types';

export interface DockerExecutorOptions {
  docker?: Docker;
  policy?: SandboxPolicy;
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
  /** The Node-side deadline fired and the container was killed. */
  hung: boolean;
}

interface ExecOptions {
  stdin: string;
  outputLimitBytes: number;
  deadlineMs: number;
  /** Called once when stdout or stderr passes the limit. */
  onOverflow?: () => void;
}

const WORKDIR = '/box';
const META_FILE = '/tmp/.arena-meta';
/** Extra time `docker exec` itself may take before we give up on it. */
const EXEC_GRACE_MS = 2000;
/** Kills every process of the sandbox user except PID 1 and the shell itself. */
const KILL_USER_PROCESSES = ['sh', '-c', 'kill -9 -1 2>/dev/null; true'];
/** Room for `sh`, `time` and `timeout` next to the program. */
const TOOLING_MEMORY_KB = 16_384;

/** Wall-clock deadline for a run: room for I/O waits, still bounded. */
export function wallLimitFor(timeLimitMs: number): number {
  return Math.round(timeLimitMs * 1.5) + 500;
}

function internalError(message: string): RunOutcome {
  return {
    status: 'internal_error',
    stdout: '',
    stderr: '',
    exitCode: null,
    signal: null,
    timeMs: 0,
    memoryKb: 0,
    message,
  };
}

/**
 * Runs each job in a fresh, locked-down container: start it idle, copy the
 * source in, compile once, then `docker exec` one run per input, and always
 * remove it.
 */
export class DockerExecutor implements Executor {
  private readonly docker: Docker;
  private readonly policy: SandboxPolicy;
  private readonly compileTimeLimitMs: number;
  private readonly minContainerMemoryKb: number;

  constructor(
    private readonly registry: LanguageRegistry,
    options: DockerExecutorOptions = {},
  ) {
    this.docker = options.docker ?? new Docker();
    this.policy = options.policy ?? DEFAULT_SANDBOX_POLICY;
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
      await this.tightenMemory(container, runner, job.limits);

      const runs: RunOutcome[] = [];
      let alive = true;
      for (const [i, input] of job.inputs.entries()) {
        if (!alive) {
          runs.push(internalError('Skipped: the sandbox was stopped by an earlier run'));
          continue;
        }
        const {outcome, hung} = await this.run(container, runner, input, job.limits);
        runs.push(outcome);
        alive = !hung;
        // Background processes from this run must not touch the next one.
        if (alive && i < job.inputs.length - 1) await this.killUserProcesses(container);
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
      User: this.policy.user,
      WorkingDir: WORKDIR,
      Env: ['HOME=/tmp'],
      NetworkDisabled: true,
      Labels: {'arena.sandbox': 'true'},
      HostConfig: hostConfigFor(this.policy, memoryKb * 1024),
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
    const timedOut =
      res.hung ||
      ((res.exitCode === 137 || res.exitCode === 124) &&
        res.wallMs >= this.compileTimeLimitMs - 100);
    const output = [res.stdout.text(), res.stderr.text()].filter(Boolean).join('\n');
    return {
      success: res.exitCode === 0 && !res.hung,
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
  ): Promise<{outcome: RunOutcome; hung: boolean}> {
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
      // Stop a program that prints forever instead of waiting for the time limit.
      onOverflow: () => void this.killUserProcesses(container),
    });

    if (res.hung) {
      // Usually a background process kept stdout open after main exited.
      return {
        hung: true,
        outcome: {
          status: 'time_limit_exceeded',
          stdout: res.stdout.text(),
          stderr: res.stderr.text(),
          exitCode: null,
          signal: null,
          timeMs: res.wallMs,
          memoryKb: 0,
          message: 'Time limit exceeded: the program or a child process did not exit',
        },
      };
    }

    if (res.stdout.truncated || res.stderr.truncated) {
      // We killed the program (and `time` with it), so there are no stats.
      return {
        hung: false,
        outcome: {
          status: 'output_limit_exceeded',
          stdout: res.stdout.text(),
          stderr: res.stderr.text(),
          exitCode: null,
          signal: null,
          timeMs: res.wallMs,
          memoryKb: 0,
          message: `Output limit of ${Math.round(limits.outputLimitBytes / 1024)} KB exceeded`,
        },
      };
    }

    const meta = await this.exec(container, ['cat', META_FILE], {
      stdin: '',
      outputLimitBytes: 4096,
      deadlineMs: 5000,
    });
    const parsed = parseTimeOutput(meta.stdout.text());
    if (!parsed) {
      return {hung: false, outcome: internalError('Could not read run statistics')};
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
    const stopped = status === 'time_limit_exceeded' || status === 'output_limit_exceeded';
    return {
      hung: false,
      outcome: {
        status,
        stdout: res.stdout.text(),
        stderr: res.stderr.text(),
        // A program we stopped has no exit code or signal of its own.
        exitCode: stopped ? null : exitCode,
        signal: stopped ? null : signalName(signal),
        timeMs:
          status === 'time_limit_exceeded' ? Math.max(parsed.cpuMs, parsed.wallMs) : parsed.cpuMs,
        memoryKb: parsed.memoryKb,
        message,
      },
    };
  }

  /**
   * The container starts with a generous memory floor so compilers fit. Before
   * running user code, lower the cap to the user's limit so the kernel stops
   * an allocation loop right away.
   */
  private async tightenMemory(
    container: Docker.Container,
    runner: LanguageRunner,
    limits: ExecutionLimits,
  ): Promise<void> {
    const bytes = (limits.memoryLimitKb + runner.memoryOverheadKb + TOOLING_MEMORY_KB) * 1024;
    // If the update fails, the floor still applies and the peak check still runs.
    await container.update({Memory: bytes, MemorySwap: bytes}).catch(() => undefined);
  }

  private async killUserProcesses(container: Docker.Container): Promise<void> {
    await this.exec(container, KILL_USER_PROCESSES, {
      stdin: '',
      outputLimitBytes: 1024,
      deadlineMs: 5000,
    }).catch(() => undefined);
  }

  /** Runs one command in the container, feeding stdin and capturing output. */
  private async exec(
    container: Docker.Container,
    cmd: readonly string[],
    opts: ExecOptions,
  ): Promise<ExecResult> {
    const exec = await container.exec({
      Cmd: [...cmd],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: WORKDIR,
    });
    const stream = await exec.start({hijack: true, stdin: true});
    const stdout = new OutputCollector(opts.outputLimitBytes, opts.onOverflow);
    const stderr = new OutputCollector(opts.outputLimitBytes, opts.onOverflow);
    this.docker.modem.demuxStream(stream, stdout, stderr);

    const started = performance.now();
    const finished = new Promise<'done'>((resolve, reject) => {
      stream.on('end', () => resolve('done'));
      stream.on('close', () => resolve('done'));
      stream.on('error', reject);
    });
    stream.end(opts.stdin);

    let timer: NodeJS.Timeout | undefined;
    const deadline = new Promise<'deadline'>((resolve) => {
      timer = setTimeout(() => resolve('deadline'), opts.deadlineMs);
    });
    const outcome = await Promise.race([finished, deadline]);
    clearTimeout(timer);
    const wallMs = Math.round(performance.now() - started);

    if (outcome === 'deadline') {
      // The in-container timeout should have fired; this is the backstop.
      stream.destroy();
      await container.kill().catch(() => undefined);
      return {exitCode: null, stdout, stderr, wallMs, hung: true};
    }
    const info = await exec.inspect();
    return {exitCode: info.ExitCode ?? null, stdout, stderr, wallMs, hung: false};
  }
}
