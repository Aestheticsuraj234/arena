import {z} from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_URL: z.url().default('http://localhost:4000'),
  WEB_URL: z.url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1).default('postgres://postgres:postgres@localhost:5432/arena'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  /** How long `POST /v1/run` waits for a verdict before answering 202. */
  RUN_WAIT_MS: z.coerce.number().int().positive().default(30_000),
  /** Submissions per API key per minute on the Judge0 API. */
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, {message: 'BETTER_AUTH_SECRET must be at least 32 characters'}),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Reads and validates environment variables. Fails fast with a readable
 * message, so a missing secret never turns into a confusing runtime error.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment variables:\n${issues.join('\n')}`);
  }
  return result.data;
}
