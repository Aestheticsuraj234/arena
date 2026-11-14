import {z} from 'zod';

import {MAX_SOURCE_LENGTH} from './run';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

/** One entry of `GET /v1/problems`. */
export interface ProblemSummary {
  slug: string;
  title: string;
  difficulty: DifficultyLevel;
}

/** `GET /v1/problems/:slug`: the statement and sample tests only. */
export interface ProblemDetail extends ProblemSummary {
  description: string;
  timeLimitMs: number;
  memoryLimitKb: number;
  samples: Array<{input: string; expectedOutput: string}>;
  totalTests: number;
}

/** Body of `POST /v1/problems/:slug/submit`. `run` checks samples only. */
export const submitProblemSchema = z.object({
  languageId: z.number().int().positive(),
  sourceCode: z.string().min(1, {message: 'Source code is empty'}).max(MAX_SOURCE_LENGTH),
  mode: z.enum(['run', 'submit']).default('submit'),
});

export type SubmitProblemRequest = z.input<typeof submitProblemSchema>;
