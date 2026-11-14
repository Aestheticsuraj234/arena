import {Fragment, type ReactNode} from 'react';

/**
 * Renders the small Markdown subset problem statements use: paragraphs,
 * **bold** and `code`. Text is never injected as HTML.
 */
export function MarkdownLite({text}: {text: string}) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i}>{inline(para)}</p>
      ))}
    </div>
  );
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded-sm bg-surface-2 px-1 font-mono text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
