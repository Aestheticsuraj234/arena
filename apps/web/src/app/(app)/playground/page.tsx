'use client';

import type {SubmissionView} from '@arena/shared';
import {Play} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';

import {CodeEditor} from '@/components/editor/code-editor';
import {LanguageSelect} from '@/components/language-select';
import {ResultPanel} from '@/components/result-panel';
import {Button} from '@/components/ui/button';
import {useLanguages} from '@/hooks/use-languages';
import {api, ApiError} from '@/lib/api';
import {DEFAULT_LANGUAGE_ID, languageUi} from '@/lib/languages';

const draftKey = (languageId: number) => `arena:playground:${languageId}`;

/** Reads a saved draft. Storage can be unavailable (private mode), so guard it. */
function loadDraft(languageId: number): string | null {
  try {
    return localStorage.getItem(draftKey(languageId));
  } catch {
    return null;
  }
}

function saveDraft(languageId: number, code: string): void {
  try {
    localStorage.setItem(draftKey(languageId), code);
  } catch {
    // Drafts are a convenience; ignore storage errors.
  }
}

export default function PlaygroundPage() {
  const languages = useLanguages();
  const [languageId, setLanguageId] = useState(DEFAULT_LANGUAGE_ID);
  const slug = languages.find((l) => l.id === languageId)?.slug;
  const ui = languageUi(slug);
  const [code, setCode] = useState('');
  const [stdin, setStdin] = useState('Arena');
  const [result, setResult] = useState<SubmissionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // Switching language loads that language's draft, or its starter program.
  useEffect(() => {
    if (slug) setCode(loadDraft(languageId) ?? ui.starter);
  }, [languageId, slug, ui.starter]);

  function updateCode(value: string) {
    setCode(value);
    saveDraft(languageId, value);
  }

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      setResult(await api.run({languageId, sourceCode: code, stdin}));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server');
    } finally {
      setRunning(false);
    }
  }, [languageId, code, stdin]);

  return (
    <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_420px]">
      <section className="flex min-h-[60vh] flex-col border-r border-border">
        <div className="flex items-center gap-3 border-b border-border px-4 py-2">
          <LanguageSelect languages={languages} value={languageId} onChange={setLanguageId} />
          <span className="text-xs text-muted">Ctrl/⌘ + Enter to run</span>
          <Button size="sm" className="ml-auto" onClick={run} disabled={running || !code.trim()}>
            <Play className="size-3.5" aria-hidden />
            {running ? 'Running…' : 'Run'}
          </Button>
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor value={code} language={ui.monaco} onChange={updateCode} onRun={run} />
        </div>
      </section>

      <aside className="flex flex-col gap-4 overflow-auto p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="stdin" className="text-xs font-medium tracking-wide text-muted uppercase">
            Input
          </label>
          <textarea
            id="stdin"
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={5}
            className="rounded-sm border border-border bg-bg p-3 font-mono text-sm focus:border-accent focus:outline-none"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {result ? (
          <ResultPanel result={result} />
        ) : (
          <p className="text-sm text-muted">Run your code to see the output here.</p>
        )}
      </aside>
    </main>
  );
}
