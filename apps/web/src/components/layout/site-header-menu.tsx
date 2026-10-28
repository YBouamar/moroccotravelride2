'use client';

import { Menu, X } from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SiteHeaderMenuProps {
  label: string;
  children: ReactNode;
}

/**
 * Mobile: a Menu button folds the header links into a panel under the logo row.
 * Desktop (md+): the button is hidden and the links always show in one row.
 */
export function SiteHeaderMenu({ label, children }: SiteHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  // Any followed link closes the panel (same pathname with a new query string included).
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('a')) setOpen(false);
  };
  // Escape closes it from the button or from inside the panel.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !open) return;
    setOpen(false);
    button.current?.focus();
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onKeyDown}
        className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border px-3 text-sm font-semibold text-primary hover:bg-background md:hidden"
      >
        {open ? (
          <X aria-hidden="true" className="size-5" />
        ) : (
          <Menu aria-hidden="true" className="size-5" />
        )}
        {label}
      </button>
      <div
        id="site-menu"
        onClick={onClick}
        onKeyDown={onKeyDown}
        className={cn(
          'w-full flex-col gap-3 border-t border-border pt-3 pb-2',
          'md:flex md:w-auto md:flex-1 md:flex-row md:items-center md:border-0 md:p-0 md:ms-6',
          open ? 'flex' : 'hidden',
        )}
      >
        {children}
      </div>
    </>
  );
}
