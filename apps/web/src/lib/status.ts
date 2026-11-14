import type {DifficultyLevel, SubmissionState} from '@arena/shared';

export type Tone = 'success' | 'danger' | 'warning' | 'neutral';

const STATUS: Record<SubmissionState, {label: string; tone: Tone}> = {
  in_queue: {label: 'In queue', tone: 'neutral'},
  processing: {label: 'Running', tone: 'neutral'},
  accepted: {label: 'Accepted', tone: 'success'},
  wrong_answer: {label: 'Wrong answer', tone: 'danger'},
  time_limit_exceeded: {label: 'Time limit exceeded', tone: 'warning'},
  memory_limit_exceeded: {label: 'Memory limit exceeded', tone: 'warning'},
  output_limit_exceeded: {label: 'Output limit exceeded', tone: 'warning'},
  compilation_error: {label: 'Compilation error', tone: 'danger'},
  runtime_error: {label: 'Runtime error', tone: 'danger'},
  internal_error: {label: 'Internal error', tone: 'danger'},
};

export function statusInfo(status: SubmissionState) {
  return STATUS[status];
}

export function isPending(status: SubmissionState): boolean {
  return status === 'in_queue' || status === 'processing';
}

export function formatMs(ms: number | null): string {
  return ms === null ? '—' : `${ms} ms`;
}

export function formatKb(kb: number | null): string {
  if (kb === null) return '—';
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export const DIFFICULTY_TONE: Record<DifficultyLevel, Tone> = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
};
