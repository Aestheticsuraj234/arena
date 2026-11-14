import type {RunVerdict} from '@arena/shared';

import {outputsMatch} from './checker';
import type {ExecutionResult, RunOutcome} from './executor/types';

export interface TestCaseSpec {
  expectedOutput: string;
}

export interface TestVerdict {
  position: number;
  status: Exclude<RunVerdict, 'compilation_error'>;
  stdout: string;
  stderr: string;
  timeMs: number;
  memoryKb: number;
}

export interface JudgeResult {
  status: RunVerdict;
  tests: TestVerdict[];
  passed: number;
  total: number;
  /** Slowest test, as judges report. */
  timeMs: number | null;
  /** Largest peak memory over the tests. */
  memoryKb: number | null;
  compileOutput: string | null;
  message: string;
  /** The first failing test, for showing its output. */
  firstFailure: TestVerdict | null;
}

/** One run's verdict against its expected output. */
export function verdictForRun(run: RunOutcome, expectedOutput: string): TestVerdict['status'] {
  if (run.status !== 'ok') return run.status;
  return outputsMatch(run.stdout, expectedOutput) ? 'accepted' : 'wrong_answer';
}

/** `afterRun` hook for the executor that stops at the first failed test. */
export function stopAtFirstFailure(tests: readonly TestCaseSpec[]) {
  return (run: RunOutcome, index: number): 'continue' | 'stop' => {
    const expected = tests[index]?.expectedOutput ?? '';
    return verdictForRun(run, expected) === 'accepted' ? 'continue' : 'stop';
  };
}

const LABELS: Record<TestVerdict['status'], string> = {
  accepted: 'Accepted',
  wrong_answer: 'Wrong answer',
  time_limit_exceeded: 'Time limit exceeded',
  memory_limit_exceeded: 'Memory limit exceeded',
  output_limit_exceeded: 'Output limit exceeded',
  runtime_error: 'Runtime error',
  internal_error: 'Internal error',
};

/**
 * Judges a problem submission: every run against its test, then one overall
 * verdict, the first failing test's verdict, like most online judges.
 */
export function judgeTests(result: ExecutionResult, tests: readonly TestCaseSpec[]): JudgeResult {
  const total = tests.length;
  if (result.compile && !result.compile.success) {
    return {
      status: 'compilation_error',
      tests: [],
      passed: 0,
      total,
      timeMs: null,
      memoryKb: null,
      compileOutput: result.compile.output,
      message: 'Compilation failed',
      firstFailure: null,
    };
  }

  const verdicts: TestVerdict[] = result.runs.map((run, position) => ({
    position,
    status: verdictForRun(run, tests[position]?.expectedOutput ?? ''),
    stdout: run.stdout,
    stderr: run.stderr,
    timeMs: run.timeMs,
    memoryKb: run.memoryKb,
  }));
  const passed = verdicts.filter((v) => v.status === 'accepted').length;
  const firstFailure = verdicts.find((v) => v.status !== 'accepted') ?? null;
  const allPassed = firstFailure === null && passed === total;

  let status: RunVerdict;
  let message: string;
  if (allPassed) {
    status = 'accepted';
    message = `Passed all ${total} test cases`;
  } else if (firstFailure) {
    status = firstFailure.status;
    message = `${LABELS[firstFailure.status]} on test ${firstFailure.position + 1}`;
  } else {
    // Fewer runs than tests without a failure: something stopped early.
    status = 'internal_error';
    message = `Only ${verdicts.length} of ${total} test cases ran`;
  }

  return {
    status,
    tests: verdicts,
    passed,
    total,
    timeMs: verdicts.length ? Math.max(...verdicts.map((v) => v.timeMs)) : null,
    memoryKb: verdicts.length ? Math.max(...verdicts.map((v) => v.memoryKb)) : null,
    compileOutput: result.compile?.output || null,
    message,
    firstFailure,
  };
}
