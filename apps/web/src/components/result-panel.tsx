import type {SubmissionView} from '@arena/shared';

import {StatusBadge} from '@/components/status-badge';
import {formatKb, formatMs} from '@/lib/status';

function Block({label, text, tone}: {label: string; text: string | null; tone?: 'danger'}) {
  if (!text) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      <pre
        className={`max-h-64 overflow-auto rounded-sm border border-border bg-bg p-3 font-mono text-sm whitespace-pre-wrap ${
          tone === 'danger' ? 'text-danger' : ''
        }`}
      >
        {text}
      </pre>
    </div>
  );
}

/** Verdict, stats and outputs of one run. */
export function ResultPanel({result}: {result: SubmissionView}) {
  return (
    <div className="flex flex-col gap-4" data-testid="result">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={result.status} />
        <span className="font-mono text-xs text-muted">{formatMs(result.timeMs)}</span>
        <span className="font-mono text-xs text-muted">{formatKb(result.memoryKb)}</span>
        {result.message && <span className="text-sm text-muted">{result.message}</span>}
      </div>
      <Block label="Compiler output" text={result.compileOutput} tone="danger" />
      <Block label="Output" text={result.stdout} />
      <Block label="Errors" text={result.stderr} tone="danger" />
    </div>
  );
}
