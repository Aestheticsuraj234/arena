'use client';

import type {ProblemSummary} from '@arena/shared';
import Link from 'next/link';
import {useEffect, useState} from 'react';

import {Badge} from '@/components/ui/badge';
import {api} from '@/lib/api';
import {DIFFICULTY_TONE} from '@/lib/status';

export default function ProblemsPage() {
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null);
  useEffect(() => {
    api.problems().then(setProblems, () => setProblems([]));
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Problems</h1>
      <ul className="divide-y divide-border rounded-md border border-border">
        {problems === null && <li className="p-4 text-sm text-muted">Loading…</li>}
        {problems?.map((p, i) => (
          <li key={p.slug}>
            <Link
              href={`/problems/${p.slug}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-surface"
            >
              <span className="w-6 font-mono text-sm text-muted">{i + 1}</span>
              <span className="font-medium">{p.title}</span>
              <Badge tone={DIFFICULTY_TONE[p.difficulty]} className="ml-auto capitalize">
                {p.difficulty}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
