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
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AppShell, type ShellNavItem } from '@/components/layout/app-shell';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { UserMenu } from '@/features/auth/components/user-menu';
import { requireUser } from '@/features/auth/session';
import { finalizePendingCompany, getMemberships } from '@/features/companies/memberships';
import { asLocale } from '@/i18n/as-locale';
import { createClient } from '@/lib/supabase/server';

interface SaasLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

// Signed-in carrier area. RLS remains the real guard on every query.
export default async function SaasLayout({ children, params }: SaasLayoutProps) {
  const locale = asLocale((await params).locale);
  const t = await getTranslations();
  const user = await requireUser(locale);

  const supabase = await createClient();
  let memberships = await getMemberships(supabase, user.id);
  if (memberships.length === 0) {
    // First visit after e-mail confirmation in another browser: create the pending company now.
    await finalizePendingCompany(supabase);
    memberships = await getMemberships(supabase, user.id);
  }
  // Multi-company selection comes later; the oldest membership is the current company.
  const company = memberships[0];

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

  const banner =
    company?.status === 'pending' ? (
      <Alert title={t('company.pending.title')}>{t('company.pending.text')}</Alert>
    ) : company?.status === 'suspended' ? (
      <Alert tone="danger" title={t('company.suspended.title')}>
        {t('company.suspended.text')}
      </Alert>
    ) : undefined;

  return (
    <AppShell
      title={t('saas.title')}
      navLabel={t('nav.main')}
      soonLabel={t('saas.soon')}
      logoAlt={t('brand.logoAlt')}
      items={company ? items : []}
      context={company?.legalName}
      topbar={<UserMenu name={user.fullName} />}
      banner={banner}
    >
      {company ? (
        children
      ) : (
        <EmptyState
          icon={Users}
          title={t('company.none.title')}
          description={t('company.none.text')}
        />
      )}
    </AppShell>
  );
}
