import type {SubmissionStatus} from '@arena/db';

/** Judge0 CE status table, IDs and descriptions exactly as Judge0 returns them. */
export const JUDGE0_STATUSES = [
  {id: 1, description: 'In Queue'},
  {id: 2, description: 'Processing'},
  {id: 3, description: 'Accepted'},
  {id: 4, description: 'Wrong Answer'},
  {id: 5, description: 'Time Limit Exceeded'},
  {id: 6, description: 'Compilation Error'},
  {id: 7, description: 'Runtime Error (SIGSEGV)'},
  {id: 8, description: 'Runtime Error (SIGXFSZ)'},
  {id: 9, description: 'Runtime Error (SIGFPE)'},
  {id: 10, description: 'Runtime Error (SIGABRT)'},
  {id: 11, description: 'Runtime Error (NZEC)'},
  {id: 12, description: 'Runtime Error (Other)'},
  {id: 13, description: 'Internal Error'},
  {id: 14, description: 'Exec Format Error'},
] as const;

export type Judge0Status = (typeof JUDGE0_STATUSES)[number];

const BY_ID = new Map<number, Judge0Status>(JUDGE0_STATUSES.map((s) => [s.id, s]));
const SIGNAL_STATUS: Record<string, number> = {SIGSEGV: 7, SIGXFSZ: 8, SIGFPE: 9, SIGABRT: 10};

function status(id: number): Judge0Status {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown Judge0 status ${id}`);
  return found;
}

/**
 * Arena status → Judge0 status. Judge0 has no memory or output limit status;
 * like Judge0 itself, those surface as "Runtime Error (Other)" with a message.
 */
export function toJudge0Status(s: SubmissionStatus, signal: string | null): Judge0Status {
  switch (s) {
    case 'in_queue':
      return status(1);
    case 'processing':
      return status(2);
    case 'accepted':
      return status(3);
    case 'wrong_answer':
      return status(4);
    case 'time_limit_exceeded':
      return status(5);
    case 'compilation_error':
      return status(6);
    case 'runtime_error':
      return status(signal ? (SIGNAL_STATUS[signal] ?? 12) : 11);
    case 'memory_limit_exceeded':
    case 'output_limit_exceeded':
      return status(12);
    case 'internal_error':
      return status(13);
  }
}
