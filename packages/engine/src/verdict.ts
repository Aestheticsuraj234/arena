import type {RunResponse} from '@arena/shared';

import type {ExecutionResult, RunOutcome} from './executor/types';

/**
 * Turns one compile + run into the API response. `ok` becomes `accepted`;
 * Chapter 8 adds expected-output checks for `wrong_answer`.
 */
export function toRunResponse(result: ExecutionResult): RunResponse {
  if (result.compile && !result.compile.success) {
    return {
      status: 'compilation_error',
      stdout: null,
      stderr: null,
      compileOutput: result.compile.output,
      message: 'Compilation failed',
      exitCode: result.compile.exitCode,
      timeMs: null,
      memoryKb: null,
    };
  }
  const run: RunOutcome | undefined = result.runs[0];
  if (!run) {
    return {
      status: 'internal_error',
      stdout: null,
      stderr: null,
      compileOutput: result.compile?.output || null,
      message: 'Nothing was run',
      exitCode: null,
      timeMs: null,
      memoryKb: null,
    };
  }
  return {
    status: run.status === 'ok' ? 'accepted' : run.status,
    stdout: run.stdout,
    stderr: run.stderr || null,
    compileOutput: result.compile?.output || null,
    message: run.message,
    exitCode: run.exitCode,
    timeMs: run.timeMs,
    memoryKb: run.memoryKb,
  };
}
