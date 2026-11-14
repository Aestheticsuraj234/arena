'use client';

import type {SubmissionView} from '@arena/shared';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useEffect, useState} from 'react';

import {CodeEditor} from '@/components/editor/code-editor';
import {ResultPanel} from '@/components/result-panel';
import {TestList} from '@/components/test-list';
import {useLanguages} from '@/hooks/use-languages';
import {api} from '@/lib/api';
import {languageUi} from '@/lib/languages';

export default function SubmissionPage() {
  const {token} = useParams<{token: string}>();
  const languages = useLanguages();
  const [s, setS] = useState<SubmissionView | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api.submission(token).then(setS, () => setMissing(true));
  }, [token]);

  if (missing) return <main className="p-10 text-sm text-muted">Submission not found.</main>;
  if (!s) return <main className="p-10 text-sm text-muted">Loading…</main>;
  const slug = languages.find((l) => l.id === s.languageId)?.slug;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center gap-3">
        <Link href="/submissions" className="text-sm text-muted hover:text-fg">
          ← Submissions
        </Link>
        {s.problemSlug && (
          <Link href={`/problems/${s.problemSlug}`} className="text-sm text-accent">
            {s.problemSlug}
          </Link>
        )}
        <span className="ml-auto font-mono text-xs text-muted">{s.token}</span>
      </div>
      <ResultPanel result={s} />
      {s.tests && s.testsTotal !== null && <TestList tests={s.tests} total={s.testsTotal} />}
      <div className="h-80 overflow-hidden rounded-md border border-border">
        <CodeEditor value={s.sourceCode} language={languageUi(slug).monaco} readOnly />
      </div>
    </main>
  );
}
