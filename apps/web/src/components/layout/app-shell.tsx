import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';
import { ShellNav, type ShellNavItem } from './shell-nav';

export type { ShellNavItem };

interface AppShellProps {
  title: string;
  navLabel: string;
  logoAlt: string;
  items: ShellNavItem[];
  /** Shown under the area title, e.g. the current company. */
  context?: string;
  /** Right side of the top bar (user name, sign out). */
  topbar?: ReactNode;
  /** Status messages above the page (company verification, trial...). */
  banner?: ReactNode;
  children: ReactNode;
}

/** Desktop-first layout shared by the carrier SaaS and the platform admin (docs/UX.md section 3). */
export function AppShell({
  title,
  navLabel,
  logoAlt,
  items,
  context,
  topbar,
  banner,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-navy text-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto">
        <div className="flex items-center justify-between gap-2 px-4 py-4 md:block">
          <Link href="/" className="inline-block rounded-control">
            <Logo tone="negatif" height={32} alt={logoAlt} />
          </Link>
          <p className="text-xs font-semibold tracking-widest text-teal uppercase md:mt-3">
            {title}
          </p>
          {context ? (
            <p className="hidden truncate text-sm text-white/85 md:mt-1 md:block">{context}</p>
          ) : null}
        </div>
        <ShellNav label={navLabel} items={items} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-border bg-surface px-4 py-2">
          <LocaleSwitcher />
          {topbar}
        </div>
        <main id="main" className="flex-1 p-4 md:p-8">
          {banner ? <div className="mb-6 flex flex-col gap-3">{banner}</div> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
