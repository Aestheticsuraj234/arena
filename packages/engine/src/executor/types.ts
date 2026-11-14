/** Outcome of one run, before comparing against expected output. */
export type RunStatus =
  | 'ok'
  | 'runtime_error'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'output_limit_exceeded'
  | 'internal_error';

export interface ExecutionLimits {
  /** CPU time limit per run. */
  timeLimitMs: number;
  /** Peak memory limit per run, on top of the language's own overhead. */
  memoryLimitKb: number;
  /** Bytes of stdout (and, separately, stderr) kept per run. */
  outputLimitBytes: number;
}

export interface ExecutionJob {
  languageId: number;
  sourceCode: string;
  /** One run per input. A plain run has one input; a problem has one per test. */
  inputs: readonly string[];
  limits: ExecutionLimits;
  /**
   * Called after each run. Return `'stop'` to skip the remaining inputs, e.g.
   * at the first failed test case. Skipped inputs have no entry in `runs`.
   */
  afterRun?: (run: RunOutcome, index: number) => 'continue' | 'stop';
}

export interface CompileOutcome {
  success: boolean;
  /** Combined stdout and stderr of the compiler. */
  output: string;
  exitCode: number | null;
  timeMs: number;
}

export interface RunOutcome {
  status: RunStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  /** Signal name when the program was killed, e.g. `SIGSEGV`. */
  signal: string | null;
  /** CPU time (user + system), or wall time when the run was killed. */
  timeMs: number;
  memoryKb: number;
  /** Human-readable reason for a non-`ok` status. */
  message: string | null;
}

export interface ExecutionResult {
  /** `null` for interpreted languages. */
  compile: CompileOutcome | null;
  /** Empty when compilation failed. */
  runs: RunOutcome[];
}

export {DEFAULT_LIMITS, MAX_LIMITS} from '@arena/shared';
