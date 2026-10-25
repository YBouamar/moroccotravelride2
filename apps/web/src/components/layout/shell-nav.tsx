'use client';

import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export interface ShellNavItem {
  key: string;
  label: string;
  /** Rendered icon element (server-rendered, so it can cross the client boundary). */
  icon: ReactNode;
  /** Items without href are upcoming (not built yet). */
  href?: string;
  /** Small label on the right: "Soon", or the offer that unlocks a locked item. */
  badge?: string;
  /** Feature not in the current offer: shown with a lock, links to the subscription page. */
  locked?: boolean;
}

const itemClass = 'flex min-h-11 items-center gap-3 rounded-control px-3 text-sm whitespace-nowrap';

export function ShellNav({ label, items }: { label: string; items: ShellNavItem[] }) {
  const pathname = usePathname();
  // Exact match for section roots (/app, /admin), prefix match for sub-pages.
  const isActive = (href: string) =>
    pathname === href || (href.split('/').length > 2 && pathname.startsWith(`${href}/`));

  return (
    <nav aria-label={label} className="overflow-x-auto px-2 pb-3 md:pb-0">
      <ul className="flex gap-1 md:flex-col">
        {items.map(({ key, label: itemLabel, icon, href, badge, locked }) => {
          const badgeElement = badge ? (
            <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-white/10 px-2 text-[11px]">
              {locked ? <Lock aria-hidden="true" className="size-3" /> : null}
              {badge}
            </span>
          ) : null;

          if (!href) {
            return (
              <li key={key}>
                <span aria-disabled="true" className={cn(itemClass, 'text-white/60')}>
                  <span aria-hidden="true">{icon}</span>
                  {itemLabel}
                  {badgeElement}
                </span>
              </li>
            );
          }

          const active = !locked && isActive(href);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  itemClass,
                  active ? 'bg-white/10 font-semibold text-white' : 'text-white/85',
                  locked && 'text-white/60',
                  'hover:bg-white/10',
                )}
              >
                <span aria-hidden="true">{icon}</span>
                {itemLabel}
                {badgeElement}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
