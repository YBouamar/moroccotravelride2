import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-card border border-border bg-surface p-6 shadow-sm', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return <h3 className={cn('text-lg font-semibold', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('mt-2 text-sm text-muted', className)} {...props} />;
}
