import type {LanguageInfo} from '@arena/shared';

/** Native select of the runnable languages. */
export function LanguageSelect({
  languages,
  value,
  onChange,
}: {
  languages: LanguageInfo[];
  value: number;
  onChange: (id: number) => void;
}) {
  return (
    <select
      aria-label="Language"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-8 rounded-sm border border-border bg-surface-2 px-2 text-sm text-fg focus:border-accent focus:outline-none"
    >
      {languages.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name} ({l.version})
        </option>
      ))}
    </select>
  );
}
