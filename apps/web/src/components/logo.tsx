import Link from 'next/link';

/** Wordmark: a prompt caret plus the name, set in mono. */
export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 font-mono text-base font-semibold">
      <span className="text-accent">&gt;_</span>
      <span>arena</span>
    </Link>
  );
}
