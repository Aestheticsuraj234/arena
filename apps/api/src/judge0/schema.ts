import {MAX_LIMITS, MAX_SOURCE_LENGTH, MAX_STDIN_LENGTH} from '@arena/shared';
import {z} from 'zod';

/**
 * Body of Judge0's `POST /submissions`. Unknown fields (callback_url,
 * compiler_options, …) are accepted and ignored.
 */
export const judge0SubmissionSchema = z.looseObject({
  source_code: z.string({message: "can't be blank"}).min(1, {message: "can't be blank"}),
  language_id: z.number({message: "can't be blank"}).int(),
  stdin: z.string().nullish(),
  expected_output: z.string().nullish(),
  /** Seconds, may be fractional. */
  cpu_time_limit: z
    .number()
    .positive()
    .max(MAX_LIMITS.timeLimitMs / 1000, {
      message: `must be less than or equal to ${MAX_LIMITS.timeLimitMs / 1000}`,
    })
    .nullish(),
  /** Kilobytes. */
  memory_limit: z
    .number()
    .int()
    .min(16_384, {message: 'must be greater than or equal to 16384'})
    .max(MAX_LIMITS.memoryLimitKb, {
      message: `must be less than or equal to ${MAX_LIMITS.memoryLimitKb}`,
    })
    .nullish(),
});

export type Judge0SubmissionBody = z.infer<typeof judge0SubmissionSchema>;

/** Judge0's 422 body: `{field: ["message", …]}`. */
export type Judge0FieldErrors = Record<string, string[]>;

export function toFieldErrors(error: z.ZodError): Judge0FieldErrors {
  const out: Judge0FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'base');
    (out[field] ??= []).push(issue.message);
  }
  return out;
}

const BASE64 = /^[A-Za-z0-9+/\s]*={0,2}\s*$/;

/** Decodes a base64 field, or returns null when it is not valid base64. */
export function decodeBase64(value: string): string | null {
  if (!BASE64.test(value)) return null;
  return Buffer.from(value, 'base64').toString('utf8');
}

/** Lengths after decoding. */
export const LENGTH_LIMITS = {
  source_code: MAX_SOURCE_LENGTH,
  stdin: MAX_STDIN_LENGTH,
  expected_output: MAX_STDIN_LENGTH,
} as const;
