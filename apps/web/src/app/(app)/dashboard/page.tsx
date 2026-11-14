'use client';

import {Code2, KeyRound, ListChecks, Trophy} from 'lucide-react';
import Link from 'next/link';

import {Card} from '@/components/ui/card';
import {authClient} from '@/lib/auth-client';

const LINKS = [
  {
    href: '/playground',
    icon: Code2,
    title: 'Playground',
    text: 'Write and run code in six languages.',
  },
  {
    href: '/problems',
    icon: Trophy,
    title: 'Problems',
    text: 'Solve problems against hidden tests.',
  },
  {
    href: '/submissions',
    icon: ListChecks,
    title: 'Submissions',
    text: 'Every run with its verdict.',
  },
  {
    href: '/settings/api-keys',
    icon: KeyRound,
    title: 'API keys',
    text: 'Call the engine from your app.',
  },
];

export default function DashboardPage() {
  const {data, isPending} = authClient.useSession();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">
          {isPending ? 'Loading…' : `Welcome, ${data?.user.name ?? ''}`}
        </h1>
        <p className="mt-1 text-muted">Your code execution engine is ready.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {LINKS.map(({href, icon: Icon, title, text}) => (
          <Link key={href} href={href} className="group">
            <Card className="flex h-full flex-col gap-2 transition-colors group-hover:border-accent/50">
              <Icon className="size-5 text-accent" aria-hidden />
              <h2 className="font-medium">{title}</h2>
              <p className="text-sm text-muted">{text}</p>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
