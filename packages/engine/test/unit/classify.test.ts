import {describe, expect, it} from 'vitest';

import {classifyRun, parseTimeOutput, type RawRun} from '../../src';

const t = {timeLimitMs: 1000, wallLimitMs: 2000, memoryLimitKb: 65_536};
const ok: RawRun = {
  exitCode: 0,
  signal: null,
  wallMs: 20,
  cpuMs: 10,
  memoryKb: 9000,
  outputTruncated: false,
};

describe('classifyRun', () => {
  it('ok', () => expect(classifyRun(ok, t).status).toBe('ok'));

  it('SIGKILL at the wall deadline is a timeout, not memory', () => {
    expect(classifyRun({...ok, signal: 9, wallMs: 2000}, t).status).toBe('time_limit_exceeded');
  });

  it('timeout exiting with 124 at the deadline is a timeout', () => {
    expect(classifyRun({...ok, exitCode: 124, wallMs: 2000}, t).status).toBe('time_limit_exceeded');
  });

  it('a program exiting 124 on its own is a runtime error', () => {
    expect(classifyRun({...ok, exitCode: 124, wallMs: 30}, t).status).toBe('runtime_error');
  });

  it('too much CPU is a timeout even if the program finished', () => {
    expect(classifyRun({...ok, cpuMs: 1001}, t).status).toBe('time_limit_exceeded');
  });

  it('early SIGKILL is the OOM killer', () => {
    expect(classifyRun({...ok, signal: 9, wallMs: 100}, t).status).toBe('memory_limit_exceeded');
  });

  it('peak memory over the limit', () => {
    expect(classifyRun({...ok, memoryKb: 70_000}, t).status).toBe('memory_limit_exceeded');
  });

  it('truncated output', () => {
    expect(classifyRun({...ok, outputTruncated: true}, t).status).toBe('output_limit_exceeded');
  });

  it('other signals and non-zero exits are runtime errors', () => {
    expect(classifyRun({...ok, signal: 11}, t)).toEqual({
      status: 'runtime_error',
      message: 'Killed by SIGSEGV',
    });
    expect(classifyRun({...ok, exitCode: 3}, t).message).toBe('Exited with code 3');
  });
});

describe('parseTimeOutput', () => {
  it('parses a normal run', () => {
    expect(parseTimeOutput('ARENA_META 0.02 0.01 0.00 9320\n')).toEqual({
      wallMs: 20,
      cpuMs: 10,
      memoryKb: 9320,
      signal: null,
    });
  });

  it('parses a killed run', () => {
    const text = 'Command terminated by signal 9\nARENA_META 1.00 0.00 0.00 1708\n';
    expect(parseTimeOutput(text)?.signal).toBe(9);
  });

  it('returns null for garbage', () => expect(parseTimeOutput('nope')).toBeNull());
});
