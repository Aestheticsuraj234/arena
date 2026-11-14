import {availableParallelism} from 'node:os';

import {z} from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1).default('postgres://postgres:postgres@localhost:5432/arena'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  /** Submissions run at once. Each uses one CPU, so default to the CPU count. */
  WORKER_CONCURRENCY: z.coerce
    .number()
    .int()
    .positive()
    .default(() => availableParallelism()),
});

export type WorkerEnv = z.infer<typeof envSchema>;

/** Reads and validates the worker's environment, failing fast. */
export function loadWorkerEnv(source: NodeJS.ProcessEnv = process.env): WorkerEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment variables:\n${issues.join('\n')}`);
  }
  return result.data;
}
