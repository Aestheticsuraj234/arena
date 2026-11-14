import {describe, expect, it} from 'vitest';

import {judgeTests, stopAtFirstFailure, type ExecutionResult, type RunOutcome} from '../../src';

const run = (stdout: string, extra: Partial<RunOutcome> = {}): RunOutcome => ({
  status: 'ok',
  stdout,
  stderr: '',
  exitCode: 0,
  signal: null,
  timeMs: 10,
  memoryKb: 1000,
  message: null,
  ...extra,
});

const tests = [{expectedOutput: '1'}, {expectedOutput: '2'}, {expectedOutput: '3'}];
const result = (...runs: RunOutcome[]): ExecutionResult => ({compile: null, runs});

describe('judgeTests', () => {
  it('accepts when every test passes, reporting max time and memory', () => {
    const r = judgeTests(
      result(run('1\n'), run('2\n', {timeMs: 40}), run('3\n', {memoryKb: 5000})),
      tests,
    );
    expect(r).toMatchObject({
      status: 'accepted',
      passed: 3,
      total: 3,
      timeMs: 40,
      memoryKb: 5000,
      message: 'Passed all 3 test cases',
      firstFailure: null,
    });
  });

  it('reports the first failing test', () => {
    const r = judgeTests(result(run('1'), run('x')), tests);
    expect(r).toMatchObject({
      status: 'wrong_answer',
      passed: 1,
      total: 3,
      message: 'Wrong answer on test 2',
    });
    expect(r.firstFailure?.stdout).toBe('x');
  });

  it('keeps runtime verdicts such as TLE', () => {
    const r = judgeTests(result(run('1'), run('', {status: 'time_limit_exceeded'})), tests);
    expect(r.status).toBe('time_limit_exceeded');
    expect(r.message).toBe('Time limit exceeded on test 2');
  });

  it('turns a compile failure into compilation_error with no tests', () => {
    const r = judgeTests(
      {compile: {success: false, output: 'boom', exitCode: 1, timeMs: 5}, runs: []},
      tests,
    );
    expect(r).toMatchObject({status: 'compilation_error', compileOutput: 'boom', tests: []});
  });

  it('flags missing runs without a failure as an internal error', () => {
    expect(judgeTests(result(run('1')), tests).status).toBe('internal_error');
  });
});

describe('stopAtFirstFailure', () => {
  it('continues on a pass and stops on a failure', () => {
    const hook = stopAtFirstFailure(tests);
    expect(hook(run('1'), 0)).toBe('continue');
    expect(hook(run('nope'), 1)).toBe('stop');
    expect(hook(run('3', {status: 'runtime_error'}), 2)).toBe('stop');
  });
});
