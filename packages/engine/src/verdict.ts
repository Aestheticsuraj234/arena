import type {RunResponse} from '@arena/shared';

import {outputsMatch} from './checker';
import type {ExecutionResult, RunOutcome} from './executor/types';

/**
 * Turns one compile + run into the API response. `ok` becomes `accepted`, or
 * `wrong_answer` when an expected output is given and does not match.
 */
export function toRunResponse(
  result: ExecutionResult,
  expectedOutput: string | null = null,
): RunResponse {
  if (result.compile && !result.compile.success) {
    return {
      status: 'compilation_error',
      stdout: null,
      stderr: null,
      compileOutput: result.compile.output,
      message: 'Compilation failed',
      exitCode: result.compile.exitCode,
      signal: null,
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
      signal: null,
      timeMs: null,
      memoryKb: null,
    };
  }
  const wrong =
    run.status === 'ok' && expectedOutput !== null && !outputsMatch(run.stdout, expectedOutput);
  return {
    status: run.status === 'ok' ? (wrong ? 'wrong_answer' : 'accepted') : run.status,
    stdout: run.stdout,
    stderr: run.stderr || null,
    compileOutput: result.compile?.output || null,
    message: wrong ? 'Output does not match the expected output' : run.message,
    exitCode: run.exitCode,
    signal: run.signal,
    timeMs: run.timeMs,
    memoryKb: run.memoryKb,
  };
}
