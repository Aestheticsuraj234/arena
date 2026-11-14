import type {SubmissionStatus} from './schema';

/**
 * Submission lifecycle:
 *
 *   in_queue ──claim──▶ processing ──finish──▶ accepted | wrong_answer | … (final)
 *       ▲                   │
 *       └──── requeue ──────┘   (worker failed; BullMQ will retry)
 *
 * A stale `processing` row (worker crashed) may be claimed again.
 */
export const FINAL_STATUSES = [
  'accepted',
  'wrong_answer',
  'time_limit_exceeded',
  'memory_limit_exceeded',
  'output_limit_exceeded',
  'compilation_error',
  'runtime_error',
  'internal_error',
] as const satisfies readonly SubmissionStatus[];

export type FinalStatus = (typeof FINAL_STATUSES)[number];

const FINAL = new Set<SubmissionStatus>(FINAL_STATUSES);

export function isFinalStatus(status: SubmissionStatus): status is FinalStatus {
  return FINAL.has(status);
}

/** Whether moving from `from` to `to` is a legal lifecycle step. */
export function canTransition(from: SubmissionStatus, to: SubmissionStatus): boolean {
  if (from === 'in_queue') return to === 'processing';
  if (from === 'processing') return to === 'in_queue' || to === 'processing' || isFinalStatus(to);
  return false; // final statuses never change
}
