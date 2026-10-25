import {
  CalendarDays,
  CarFront,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  Route,
  Users,
  UserRound,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { AppShell, type ShellNavItem } from '@/components/layout/app-shell';

// Access control (session, membership, role) is added with auth in step 5; RLS stays the real guard.
export default function SaasLayout({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const items: ShellNavItem[] = [
    {
      key: 'dashboard',
      label: t('saas.nav.dashboard'),
      icon: LayoutDashboard,
      href: '/app',
      active: true,
    },
    { key: 'planning', label: t('saas.nav.planning'), icon: CalendarDays },
    { key: 'trips', label: t('saas.nav.trips'), icon: Route },
    { key: 'bookings', label: t('saas.nav.bookings'), icon: ClipboardList },
    { key: 'fleet', label: t('saas.nav.fleet'), icon: CarFront },
    { key: 'drivers', label: t('saas.nav.drivers'), icon: UserRound },
    { key: 'clients', label: t('saas.nav.clients'), icon: Users },
    { key: 'invoices', label: t('saas.nav.invoices'), icon: FileText },
    { key: 'subscription', label: t('saas.nav.subscription'), icon: CreditCard },
  ];

  return (
    <AppShell
      title={t('saas.title')}
      navLabel={t('nav.main')}
      soonLabel={t('saas.soon')}
      logoAlt={t('brand.logoAlt')}
      items={items}
    >
      {children}
    </AppShell>
  );
}
