import {describe, expect, it} from 'vitest';

import {outputsMatch, toRunResponse, type ExecutionResult} from '../../src';

describe('outputsMatch', () => {
  it('ignores trailing whitespace, trailing newlines and CRLF', () => {
    expect(outputsMatch('5  \r\n6\n\n\n', '5\n6')).toBe(true);
  });

  it('keeps leading spaces, inner spaces and case significant', () => {
    expect(outputsMatch(' 5', '5')).toBe(false);
    expect(outputsMatch('a  b', 'a b')).toBe(false);
    expect(outputsMatch('Yes', 'YES')).toBe(false);
  });

  it('detects missing and extra lines', () => {
    expect(outputsMatch('1\n2', '1\n2\n3')).toBe(false);
    expect(outputsMatch('1\n\n2', '1\n2')).toBe(false);
  });
});

describe('toRunResponse with expected output', () => {
  const result = (stdout: string): ExecutionResult => ({
    compile: null,
    runs: [
      {
        status: 'ok',
        stdout,
        stderr: '',
        exitCode: 0,
        signal: null,
        timeMs: 1,
        memoryKb: 1,
        message: null,
      },
    ],
  });

  it('accepts a match', () => {
    expect(toRunResponse(result('5\n'), '5').status).toBe('accepted');
  });

  it('flags a mismatch as wrong answer', () => {
    expect(toRunResponse(result('6\n'), '5')).toMatchObject({
      status: 'wrong_answer',
      message: 'Output does not match the expected output',
    });
  });

  it('accepts any output without an expected output', () => {
    expect(toRunResponse(result('anything')).status).toBe('accepted');
  });
});
