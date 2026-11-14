import type {HTMLAttributes} from 'react';

import {cn} from '@/lib/cn';
import type {Tone} from '@/lib/status';

const TONES: Record<Tone, string> = {
  success: 'border-accent/30 bg-accent/10 text-accent',
  danger: 'border-danger/30 bg-danger/10 text-danger',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  neutral: 'border-border bg-surface-2 text-muted',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {tone?: Tone}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
