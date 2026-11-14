'use client';

import type {SubmissionView} from '@arena/shared';
import Link from 'next/link';
import {useEffect, useState} from 'react';

import {StatusBadge} from '@/components/status-badge';
import {useLanguages} from '@/hooks/use-languages';
import {api} from '@/lib/api';
import {formatKb, formatMs} from '@/lib/status';

export default function SubmissionsPage() {
  const languages = useLanguages();
  const [rows, setRows] = useState<SubmissionView[] | null>(null);
  useEffect(() => {
    api.submissions().then(setRows, () => setRows([]));
  }, []);
  const languageName = (id: number) => languages.find((l) => l.id === id)?.name ?? id;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Submissions</h1>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs text-muted uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">When</th>
              <th className="px-4 py-2 font-medium">Problem</th>
              <th className="px-4 py-2 font-medium">Language</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-4 py-2 font-medium">Memory</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows === null && (
              <tr>
                <td colSpan={6} className="px-4 py-3 text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {rows?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-3 text-muted">
                  No submissions yet. Try the playground.
                </td>
              </tr>
            )}
            {rows?.map((s) => (
              <tr key={s.token} className="hover:bg-surface">
                <td className="px-4 py-2">
                  <Link href={`/submissions/${s.token}`} className="hover:text-accent">
                    {new Date(s.createdAt).toLocaleString()}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted">
                  {s.testsTotal !== null ? 'Problem' : 'Run'}
                </td>
                <td className="px-4 py-2">{languageName(s.languageId)}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-4 py-2 font-mono text-xs">{formatMs(s.timeMs)}</td>
                <td className="px-4 py-2 font-mono text-xs">{formatKb(s.memoryKb)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
