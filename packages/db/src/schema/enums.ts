import {pgEnum} from 'drizzle-orm/pg-core';

/**
 * Lifecycle and verdict of a run. `in_queue` and `processing` are transient;
 * everything else is final. Chapter 7 maps these to Judge0 status IDs.
 */
export const submissionStatus = pgEnum('submission_status', [
  'in_queue',
  'processing',
  'accepted',
  'wrong_answer',
  'time_limit_exceeded',
  'memory_limit_exceeded',
  'output_limit_exceeded',
  'compilation_error',
  'runtime_error',
  'internal_error',
]);

export const difficulty = pgEnum('difficulty', ['easy', 'medium', 'hard']);

export type SubmissionStatus = (typeof submissionStatus.enumValues)[number];
export type Difficulty = (typeof difficulty.enumValues)[number];
