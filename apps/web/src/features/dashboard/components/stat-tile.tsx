import type { LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  href: string;
  /** Draws attention (e.g. trips to assign, overdue invoices) when the value needs action. */
  attention?: boolean;
}

/** Key figure of the dashboard, linking to the page where it can be acted on. */
export function StatTile({ icon: Icon, label, value, href, attention }: StatTileProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-4 rounded-card border bg-surface p-4 shadow-sm hover:bg-background',
        attention ? 'border-danger' : 'border-border',
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background">
        <Icon
          aria-hidden="true"
          className={cn('size-5', attention ? 'text-danger' : 'text-secondary')}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold" dir="ltr">
          {value}
        </span>
        <span className="block text-sm text-muted">{label}</span>
      </span>
    </Link>
  );
}
