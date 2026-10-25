import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { LocaleSwitcher } from './locale-switcher';

export interface ShellNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Items without href are shown as upcoming (not yet built). */
  href?: string;
  active?: boolean;
}

interface AppShellProps {
  title: string;
  navLabel: string;
  soonLabel: string;
  logoAlt: string;
  items: ShellNavItem[];
  children: ReactNode;
}

/** Desktop-first layout shared by the carrier SaaS and the platform admin (docs/UX.md section 3). */
export function AppShell({ title, navLabel, soonLabel, logoAlt, items, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-navy text-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0">
        <div className="flex items-center justify-between gap-2 px-4 py-4 md:block">
          <Link href="/" className="inline-block rounded-control">
            <Logo tone="negatif" height={32} alt={logoAlt} />
          </Link>
          <p className="text-xs font-semibold tracking-widest text-teal uppercase md:mt-3">
            {title}
          </p>
        </div>
        <nav aria-label={navLabel} className="overflow-x-auto px-2 pb-3 md:pb-0">
          <ul className="flex gap-1 md:flex-col">
            {items.map(({ key, label, icon: Icon, href, active }) => {
              const itemClass =
                'flex min-h-11 items-center gap-3 rounded-control px-3 text-sm whitespace-nowrap';
              return (
                <li key={key}>
                  {href ? (
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        itemClass,
                        active ? 'bg-white/10 font-semibold text-white' : 'text-white/85',
                        'hover:bg-white/10',
                      )}
                    >
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      {label}
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={cn(itemClass, 'text-white/60')}>
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      {label}
                      <span className="ms-auto rounded-full bg-white/10 px-2 text-[11px]">
                        {soonLabel}
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-end border-b border-border bg-surface px-4 py-2">
          <LocaleSwitcher />
        </div>
        <main id="main" className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
