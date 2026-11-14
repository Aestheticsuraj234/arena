import type {SubmissionState} from '@arena/shared';

import {Badge} from '@/components/ui/badge';
import {isPending, statusInfo} from '@/lib/status';

export function StatusBadge({status}: {status: SubmissionState}) {
  const {label, tone} = statusInfo(status);
  return (
    <Badge tone={tone} data-status={status}>
      {isPending(status) && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
      {label}
    </Badge>
  );
}
