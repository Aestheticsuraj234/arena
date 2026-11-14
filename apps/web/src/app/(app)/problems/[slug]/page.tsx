'use client';

import type {ProblemDetail, SubmissionView} from '@arena/shared';
import {FlaskConical, Send} from 'lucide-react';
import {useParams} from 'next/navigation';
import {useCallback, useEffect, useState} from 'react';

import {CodeEditor} from '@/components/editor/code-editor';
import {LanguageSelect} from '@/components/language-select';
import {MarkdownLite} from '@/components/markdown-lite';
import {StatusBadge} from '@/components/status-badge';
import {TestList} from '@/components/test-list';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {useLanguages} from '@/hooks/use-languages';
import {useSubmissionStream} from '@/hooks/use-submission-stream';
import {api, ApiError} from '@/lib/api';
import {DEFAULT_LANGUAGE_ID, languageUi} from '@/lib/languages';
import {DIFFICULTY_TONE, formatKb, formatMs} from '@/lib/status';

export default function ProblemPage() {
  const {slug} = useParams<{slug: string}>();
  const languages = useLanguages();
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [languageId, setLanguageId] = useState(DEFAULT_LANGUAGE_ID);
  const langSlug = languages.find((l) => l.id === languageId)?.slug;
  const ui = languageUi(langSlug);
  const [code, setCode] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<'run' | 'submit'>('submit');
  const [result, setResult] = useState<SubmissionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const live = useSubmissionStream(token);

  useEffect(() => {
    api.problem(slug).then(setProblem, () => setError('Problem not found'));
  }, [slug]);

  useEffect(() => {
    if (langSlug) setCode(ui.starter);
  }, [langSlug, ui.starter]);

  // When the stream says done, load the full verdict with per-test details.
  useEffect(() => {
    if (live?.done && token) api.submission(token).then(setResult, () => undefined);
  }, [live?.done, token]);

  const busy = token !== null && !live?.done;

  const send = useCallback(
    async (nextMode: 'run' | 'submit') => {
      setError(null);
      setResult(null);
      setMode(nextMode);
      try {
        const created = await api.submitProblem(slug, {
          languageId,
          sourceCode: code,
          mode: nextMode,
        });
        setToken(created.token);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not reach the server');
      }
    },
    [slug, languageId, code],
  );

  if (!problem) {
    return <main className="p-10 text-sm text-muted">{error ?? 'Loading…'}</main>;
  }

  const total = live?.total ?? (mode === 'run' ? problem.samples.length : problem.totalTests);
  const tests = result?.tests ?? live?.tests ?? [];

  return (
    <main className="grid min-h-0 flex-1 grid-cols-1 lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(320px,2fr)_3fr]">
      <section className="flex flex-col gap-5 overflow-auto border-r border-border p-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{problem.title}</h1>
          <Badge tone={DIFFICULTY_TONE[problem.difficulty]} className="capitalize">
            {problem.difficulty}
          </Badge>
        </div>
        <MarkdownLite text={problem.description} />
        <p className="font-mono text-xs text-muted">
          Time limit {formatMs(problem.timeLimitMs)} · Memory {formatKb(problem.memoryLimitKb)}
        </p>
        {problem.samples.map((s, i) => (
          <div key={i} className="grid grid-cols-2 gap-3 font-mono text-sm">
            <div>
              <div className="mb-1 text-xs text-muted">Sample input {i + 1}</div>
              <pre className="rounded-sm border border-border bg-bg p-2 whitespace-pre-wrap">
                {s.input}
              </pre>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted">Sample output {i + 1}</div>
              <pre className="rounded-sm border border-border bg-bg p-2 whitespace-pre-wrap">
                {s.expectedOutput}
              </pre>
            </div>
          </div>
        ))}
      </section>

      <section className="grid min-h-[80vh] grid-rows-[auto_minmax(240px,1fr)_minmax(180px,40%)] lg:min-h-0">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <LanguageSelect languages={languages} value={languageId} onChange={setLanguageId} />
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => send('run')} disabled={busy}>
              <FlaskConical className="size-3.5" aria-hidden />
              Run samples
            </Button>
            <Button size="sm" onClick={() => send('submit')} disabled={busy}>
              <Send className="size-3.5" aria-hidden />
              Submit
            </Button>
          </div>
        </div>
        <div className="min-h-0">
          <CodeEditor value={code} language={ui.monaco} onChange={setCode} />
        </div>
        <div className="flex min-h-0 flex-col gap-3 overflow-auto border-t border-border p-4">
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          {live ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={result?.status ?? live.status} />
                {result && (
                  <>
                    <span className="text-sm text-muted">{result.message}</span>
                    <span className="font-mono text-xs text-muted">
                      {formatMs(result.timeMs)} · {formatKb(result.memoryKb)}
                    </span>
                  </>
                )}
              </div>
              {result?.compileOutput && (
                <pre className="rounded-sm border border-border bg-bg p-3 font-mono text-xs whitespace-pre-wrap text-danger">
                  {result.compileOutput}
                </pre>
              )}
              <TestList tests={tests} total={total} />
            </>
          ) : (
            <p className="text-sm text-muted">
              Run the samples to check your idea, then submit against every test.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
