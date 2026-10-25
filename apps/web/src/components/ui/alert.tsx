import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const alertVariants = cva('flex gap-3 rounded-control border p-4 text-sm', {
  variants: {
    tone: {
      danger: 'border-danger/30 bg-danger-surface text-danger',
      success: 'border-success/30 bg-success-surface text-success',
      info: 'border-border bg-background text-foreground',
    },
  },
  defaultVariants: { tone: 'info' },
});

const ICONS = { danger: AlertTriangle, success: CheckCircle2, info: Info } as const;

interface AlertProps extends VariantProps<typeof alertVariants> {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  const Icon = ICONS[tone ?? 'info'];
  return (
    // Errors interrupt (role=alert); other messages are announced politely.
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(alertVariants({ tone }), className)}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? 'mt-1' : undefined}>{children}</div>
      </div>
    </div>
  );
}
