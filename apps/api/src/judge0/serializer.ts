import {constants} from 'node:os';

import type {Language, Submission} from '@arena/db';

import {toJudge0Status} from './statuses';

/** Fields Judge0 returns when `fields` is not given. */
export const DEFAULT_FIELDS = [
  'stdout',
  'time',
  'memory',
  'stderr',
  'token',
  'compile_output',
  'message',
  'status',
] as const;

export const ALL_FIELDS = [
  'token',
  'source_code',
  'language_id',
  'language',
  'stdin',
  'expected_output',
  'stdout',
  'stderr',
  'compile_output',
  'message',
  'exit_code',
  'exit_signal',
  'status',
  'status_id',
  'created_at',
  'finished_at',
  'time',
  'memory',
  'cpu_time_limit',
  'memory_limit',
] as const;

export type Judge0Field = (typeof ALL_FIELDS)[number];
const KNOWN = new Set<string>(ALL_FIELDS);

/** Parses `?fields=a,b` or `*`. Unknown names are ignored, like Judge0. */
export function parseFields(param: string | undefined): readonly Judge0Field[] {
  if (!param) return DEFAULT_FIELDS;
  if (param.trim() === '*') return ALL_FIELDS;
  return param
    .split(',')
    .map((f) => f.trim())
    .filter((f): f is Judge0Field => KNOWN.has(f));
}

const encode = (value: string | null, base64: boolean) =>
  value === null ? null : base64 ? Buffer.from(value, 'utf8').toString('base64') : value;

const signalNumber = (name: string | null) =>
  name ? ((constants.signals as Record<string, number>)[name] ?? null) : null;

/** A stored submission in Judge0's JSON shape, limited to `fields`. */
export function toJudge0Submission(
  s: Submission,
  language: Language | undefined,
  fields: readonly Judge0Field[],
  base64: boolean,
): Record<string, unknown> {
  const status = toJudge0Status(s.status, s.signal);
  const all: Record<Judge0Field, unknown> = {
    token: s.token,
    source_code: encode(s.sourceCode, base64),
    language_id: s.languageId,
    language: language ? {id: language.id, name: `${language.name} (${language.version})`} : null,
    stdin: encode(s.stdin, base64),
    expected_output: encode(s.expectedOutput, base64),
    stdout: encode(s.stdout, base64),
    stderr: encode(s.stderr, base64),
    compile_output: encode(s.compileOutput, base64),
    message: encode(s.message, base64),
    exit_code: s.exitCode,
    exit_signal: signalNumber(s.signal),
    status: {id: status.id, description: status.description},
    status_id: status.id,
    created_at: s.createdAt.toISOString(),
    finished_at: s.finishedAt?.toISOString() ?? null,
    // Judge0 reports time as a string of seconds.
    time: s.timeMs === null ? null : (s.timeMs / 1000).toFixed(3),
    memory: s.memoryKb,
    cpu_time_limit: s.timeLimitMs / 1000,
    memory_limit: s.memoryLimitKb,
  };
  return Object.fromEntries(fields.map((f) => [f, all[f]]));
}
