/**
 * Normalizes program output for comparison, like most judges do: Windows line
 * endings become `\n`, trailing spaces on each line and trailing blank lines
 * are ignored. Everything else (case, inner spaces, order) must match.
 */
export function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n+$/, '');
}

/** True when `actual` matches `expected` after normalization. */
export function outputsMatch(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}
