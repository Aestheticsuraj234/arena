'use client';

import Editor, {loader} from '@monaco-editor/react';

// Load Monaco from this app (copied by scripts/copy-monaco.mjs), not a CDN.
loader.config({paths: {vs: '/monaco/vs'}});

export interface CodeEditorProps {
  value: string;
  language: string;
  onChange?: (value: string) => void;
  /** Called on Ctrl/Cmd+Enter. */
  onRun?: () => void;
  readOnly?: boolean;
  height?: string;
}

/** Monaco with Arena's dark theme. */
export function CodeEditor({
  value,
  language,
  onChange,
  onRun,
  readOnly = false,
  height = '100%',
}: CodeEditorProps) {
  return (
    <Editor
      height={height}
      language={language}
      value={value}
      theme="arena-dark"
      onChange={(v) => onChange?.(v ?? '')}
      beforeMount={(monaco) => {
        monaco.editor.defineTheme('arena-dark', {
          base: 'vs-dark',
          inherit: true,
          rules: [],
          colors: {
            'editor.background': '#0b0d10',
            'editor.lineHighlightBackground': '#12151a',
            'editorLineNumber.foreground': '#4b5361',
            'editorGutter.background': '#0b0d10',
          },
        });
      }}
      onMount={(editor, monaco) => {
        if (onRun) {
          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onRun);
        }
      }}
      options={{
        readOnly,
        fontSize: 14,
        fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
        minimap: {enabled: false},
        scrollBeyondLastLine: false,
        tabSize: 2,
        automaticLayout: true,
        padding: {top: 12},
      }}
      loading={<div className="p-4 font-mono text-sm text-muted">Loading editor…</div>}
    />
  );
}
