import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Native select: accessible and usable on mobile without extra JavaScript. */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'min-h-11 w-full rounded-control border border-border bg-surface px-3 text-base text-foreground disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
