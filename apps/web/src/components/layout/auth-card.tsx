import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <Card>
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
      {footer ? (
        <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4 text-sm">{footer}</div>
      ) : null}
    </Card>
  );
}
