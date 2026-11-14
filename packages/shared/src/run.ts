import {z} from 'zod';

/** Limits applied when the caller does not set them. */
export const DEFAULT_LIMITS = {
  timeLimitMs: 2000,
  memoryLimitKb: 262_144,
  outputLimitBytes: 64 * 1024,
} as const;

/** The most a caller may ask for. */
export const MAX_LIMITS = {
  timeLimitMs: 15_000,
  memoryLimitKb: 1_048_576,
  outputLimitBytes: 1024 * 1024,
} as const;

/** Largest accepted source file and stdin, in characters. */
export const MAX_SOURCE_LENGTH = 64 * 1024;
export const MAX_STDIN_LENGTH = 1024 * 1024;

/** Body of `POST /v1/run`. */
export const runRequestSchema = z.object({
  languageId: z.number().int().positive(),
  sourceCode: z.string().min(1, {message: 'Source code is empty'}).max(MAX_SOURCE_LENGTH),
  stdin: z.string().max(MAX_STDIN_LENGTH).default(''),
  timeLimitMs: z.number().int().min(100).max(MAX_LIMITS.timeLimitMs).optional(),
  memoryLimitKb: z.number().int().min(16_384).max(MAX_LIMITS.memoryLimitKb).optional(),
});

export type RunRequest = z.input<typeof runRequestSchema>;

/** Final statuses a run can end with. */
export type RunVerdict =
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'output_limit_exceeded'
  | 'compilation_error'
  | 'runtime_error'
  | 'internal_error';

/** Response of `POST /v1/run`. */
export interface RunResponse {
  status: RunVerdict;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  message: string | null;
  exitCode: number | null;
  /** Signal that killed the program, e.g. `SIGSEGV`. */
  signal: string | null;
  timeMs: number | null;
  memoryKb: number | null;
}

/** One entry of `GET /v1/languages`. */
export interface LanguageInfo {
  id: number;
  slug: string;
  name: string;
  version: string;
}

/** Body of `POST /v1/submissions`: a run that is queued, not awaited. */
export const createSubmissionSchema = runRequestSchema.extend({
  expectedOutput: z.string().max(MAX_STDIN_LENGTH).optional(),
});

export type CreateSubmissionRequest = z.input<typeof createSubmissionSchema>;

export type SubmissionState = 'in_queue' | 'processing' | RunVerdict;

/** A stored submission, as returned by `GET /v1/submissions/:token`. */
export interface SubmissionView extends Omit<RunResponse, 'status'> {
  token: string;
  status: SubmissionState;
  languageId: number;
  sourceCode: string;
  stdin: string | null;
  createdAt: string;
  finishedAt: string | null;
}
