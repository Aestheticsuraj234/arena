'use client';

import {Copy, KeyRound, Trash2} from 'lucide-react';
import {useEffect, useState, type FormEvent} from 'react';

import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {api, ApiError, API_URL, type ApiKeyView} from '@/lib/api';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyView[] | null>(null);
  const [name, setName] = useState('');
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = () => api.apiKeys().then(setKeys, () => setKeys([]));
  useEffect(() => {
    void reload();
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const key = await api.createApiKey(name.trim());
      setCreated(key.key);
      setCopied(false);
      setName('');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the key');
    }
  }

  async function revoke(id: string) {
    await api.revokeApiKey(id);
    await reload();
  }

  async function copy() {
    if (!created) return;
    await navigator.clipboard.writeText(created).catch(() => undefined);
    setCopied(true);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">API keys</h1>
        <p className="mt-1 text-sm text-muted">
          Use a key in the <code className="font-mono">X-Auth-Token</code> header to call the
          Judge0-compatible API at <code className="font-mono">{API_URL}/submissions</code>.
        </p>
      </div>

      <form onSubmit={create} className="flex gap-2">
        <Input
          aria-label="Key name"
          placeholder="Name, e.g. my-app"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={!name.trim()}>
          <KeyRound className="size-4" aria-hidden />
          Create key
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {created && (
        <Card className="flex flex-col gap-3 border-accent/40" data-testid="new-key">
          <p className="text-sm">Copy this key now. You won&apos;t be able to see it again.</p>
          <div className="flex gap-2">
            <code className="flex-1 overflow-x-auto rounded-sm bg-bg p-2 font-mono text-sm">
              {created}
            </code>
            <Button variant="secondary" size="sm" onClick={copy}>
              <Copy className="size-3.5" aria-hidden />
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </Card>
      )}

      <ul className="divide-y divide-border rounded-md border border-border">
        {keys?.length === 0 && <li className="p-4 text-sm text-muted">No keys yet.</li>}
        {keys?.map((k) => (
          <li key={k.id} className="flex items-center gap-4 px-4 py-3 text-sm">
            <span className="font-medium">{k.name}</span>
            <code className="font-mono text-xs text-muted">{k.prefix}…</code>
            <span className="ml-auto text-xs text-muted">
              {k.lastUsedAt ? `Used ${new Date(k.lastUsedAt).toLocaleString()}` : 'Never used'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Revoke ${k.name}`}
              onClick={() => revoke(k.id)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
    </main>
  );
}
