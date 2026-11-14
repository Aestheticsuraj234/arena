'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {useEffect, type ReactNode} from 'react';

import {Logo} from '@/components/logo';
import {Button} from '@/components/ui/button';
import {authClient} from '@/lib/auth-client';
import {cn} from '@/lib/cn';

const NAV = [
  {href: '/playground', label: 'Playground'},
  {href: '/problems', label: 'Problems'},
  {href: '/submissions', label: 'Submissions'},
  {href: '/settings/api-keys', label: 'API keys'},
];

/** Header, navigation and the session check shared by every signed-in page. */
export function AppShell({children}: {children: ReactNode}) {
  const router = useRouter();
  const pathname = usePathname();
  const {data, isPending} = authClient.useSession();

  useEffect(() => {
    // The cookie existed but the session is gone (expired or revoked).
    if (!isPending && !data) router.replace('/sign-in');
  }, [isPending, data, router]);

  async function signOut() {
    await authClient.signOut();
    router.replace('/sign-in');
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-6 border-b border-border px-6">
        <Logo />
        <nav className="flex items-center gap-1">
          {NAV.map(({href, label}) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'rounded-sm px-3 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-fg',
                pathname.startsWith(href) && 'bg-surface-2 text-fg',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {data && <span className="text-sm text-muted">{data.user.email}</span>}
          <Button variant="secondary" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
