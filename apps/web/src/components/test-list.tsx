import type {TestResultView} from '@arena/shared';
import {Check, Circle, X} from 'lucide-react';

import {formatMs} from '@/lib/status';

type Row = Pick<TestResultView, 'position' | 'status' | 'timeMs'> & {
  sample?: TestResultView['sample'];
};

/** One row per test case: ran and passed, ran and failed, or not run yet. */
export function TestList({tests, total}: {tests: Row[]; total: number}) {
  const byPosition = new Map(tests.map((t) => [t.position, t]));
  return (
    <ol className="flex flex-col gap-1.5" data-testid="tests">
      {Array.from({length: total}, (_, position) => {
        const t = byPosition.get(position);
        const passed = t?.status === 'accepted';
        return (
          <li
            key={position}
            data-test-status={t?.status ?? 'pending'}
            className="flex flex-col gap-1 rounded-sm border border-border px-3 py-2"
          >
            <div className="flex items-center gap-2 text-sm">
              {!t ? (
                <Circle className="size-4 text-muted" aria-hidden />
              ) : passed ? (
                <Check className="size-4 text-accent" aria-hidden />
              ) : (
                <X className="size-4 text-danger" aria-hidden />
              )}
              <span>Test {position + 1}</span>
              <span className="ml-auto font-mono text-xs text-muted">
                {t ? formatMs(t.timeMs) : 'not run'}
              </span>
            </div>
            {t?.sample && !passed && (
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div>
                  <div className="text-muted">Expected</div>
                  <pre className="whitespace-pre-wrap">{t.sample.expectedOutput}</pre>
                </div>
                <div>
                  <div className="text-muted">Your output</div>
                  <pre className="whitespace-pre-wrap text-danger">{t.sample.stdout}</pre>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
