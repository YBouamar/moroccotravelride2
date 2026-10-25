import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-background">
        <Icon aria-hidden="true" className="size-6 text-secondary" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
