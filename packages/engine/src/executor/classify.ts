import {constants} from 'node:os';

import type {RunStatus} from './types';

/** Parsed `/usr/bin/time` output plus the exit code `docker exec` reported. */
export interface RawRun {
  exitCode: number | null;
  /** Signal number from "Command terminated by signal N", if any. */
  signal: number | null;
  wallMs: number;
  cpuMs: number;
  memoryKb: number;
  outputTruncated: boolean;
}

export interface Thresholds {
  timeLimitMs: number;
  /** The wall clock at which `timeout` kills the program. */
  wallLimitMs: number;
  /** User limit plus the language's overhead. */
  memoryLimitKb: number;
}

const SIGKILL = 9;
/** `timeout` exits with 124 when it had to stop the program. */
const TIMEOUT_EXIT = 124;
/** Wall time within this margin of the kill deadline counts as timed out. */
const WALL_MARGIN_MS = 50;

const SIGNAL_NAMES = new Map(
  Object.entries(constants.signals).map(([name, num]) => [num, name] as const),
);

export function signalName(signal: number | null): string | null {
  if (signal === null) return null;
  return SIGNAL_NAMES.get(signal) ?? `SIG${signal}`;
}

/**
 * Decides the status of a finished run. The order matters: a program killed
 * by `timeout` also reports SIGKILL, so time is checked before memory.
 */
export function classifyRun(
  raw: RawRun,
  t: Thresholds,
): {status: RunStatus; message: string | null} {
  const killed = raw.signal === SIGKILL;
  const stopped = killed || raw.exitCode === TIMEOUT_EXIT;
  if ((stopped && raw.wallMs >= t.wallLimitMs - WALL_MARGIN_MS) || raw.cpuMs > t.timeLimitMs) {
    return {status: 'time_limit_exceeded', message: `Time limit of ${t.timeLimitMs} ms exceeded`};
  }
  if (killed || raw.memoryKb > t.memoryLimitKb) {
    return {
      status: 'memory_limit_exceeded',
      message: `Memory limit of ${Math.round(t.memoryLimitKb / 1024)} MB exceeded`,
    };
  }
  if (raw.outputTruncated) {
    return {status: 'output_limit_exceeded', message: 'Output limit exceeded'};
  }
  if (raw.signal !== null) {
    return {status: 'runtime_error', message: `Killed by ${signalName(raw.signal)}`};
  }
  if (raw.exitCode !== 0) {
    return {status: 'runtime_error', message: `Exited with code ${raw.exitCode ?? 'unknown'}`};
  }
  return {status: 'ok', message: null};
}

/** Parses the file written by `/usr/bin/time -f 'ARENA_META %e %U %S %M'`. */
export function parseTimeOutput(text: string): {
  wallMs: number;
  cpuMs: number;
  memoryKb: number;
  signal: number | null;
} | null {
  const meta = /ARENA_META ([\d.]+) ([\d.]+) ([\d.]+) (\d+)/.exec(text);
  if (!meta) return null;
  const [, wall, user, sys, mem] = meta;
  const sig = /terminated by signal (\d+)/.exec(text);
  return {
    wallMs: Math.round(Number(wall) * 1000),
    cpuMs: Math.round((Number(user) + Number(sys)) * 1000),
    memoryKb: Number(mem),
    signal: sig?.[1] ? Number(sig[1]) : null,
  };
}
