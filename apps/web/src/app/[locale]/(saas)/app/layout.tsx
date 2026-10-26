import { trialDaysLeft, type Feature } from '@mtr/shared';
import {
  CalendarDays,
  CarFront,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  MapPinned,
  Receipt,
  Route,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AppShell, type ShellNavItem } from '@/components/layout/app-shell';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { UserMenu } from '@/features/auth/components/user-menu';
import { requireUser } from '@/features/auth/session';
import { getCompanyContext } from '@/features/companies/context';
import { getPlans, lowestPlanWith } from '@/features/subscriptions/plans';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

interface SaasLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

const icon = (Icon: typeof LayoutDashboard) => <Icon className="size-4 shrink-0" />;

// Signed-in carrier area. RLS remains the real guard on every query.
export default async function SaasLayout({ children, params }: SaasLayoutProps) {
  const locale = asLocale((await params).locale);
  const user = await requireUser(locale);
  const [t, context, plans] = await Promise.all([
    getTranslations(),
    getCompanyContext(),
    getPlans(),
  ]);

  // Sections of the offer link to their page (or show "soon" when not built yet); the others are
  // locked with the offer that unlocks them.
  const section = (
    key: string,
    label: string,
    Icon: typeof LayoutDashboard,
    feature: Feature,
    href?: string,
  ) => {
    if (context?.features.has(feature)) {
      return href
        ? ({ key, label, icon: icon(Icon), href } satisfies ShellNavItem)
        : ({ key, label, icon: icon(Icon), badge: t('saas.soon') } satisfies ShellNavItem);
    }
    const plan = lowestPlanWith(plans, feature);
    return {
      key,
      label,
      icon: icon(Icon),
      href: '/app/subscription',
      locked: true,
      badge: plan ? t(`plans.${plan}`) : undefined,
    } satisfies ShellNavItem;
  };

  const items: ShellNavItem[] = [
    { key: 'dashboard', label: t('saas.nav.dashboard'), icon: icon(LayoutDashboard), href: '/app' },
    section('planning', t('saas.nav.planning'), CalendarDays, 'trips', '/app/planning'),
    section('trips', t('saas.nav.trips'), Route, 'trips', '/app/trips'),
    section('bookings', t('saas.nav.bookings'), ClipboardList, 'trips'),
    section('fleet', t('saas.nav.fleet'), CarFront, 'vehicles', '/app/fleet'),
    section('drivers', t('saas.nav.drivers'), UserRound, 'drivers', '/app/drivers'),
    section('clients', t('saas.nav.clients'), Users, 'clients', '/app/clients'),
    section('invoices', t('saas.nav.invoices'), FileText, 'invoicing', '/app/invoices'),
    section('expenses', t('saas.nav.expenses'), Receipt, 'expenses'),
    section('tracking', t('saas.nav.tracking'), MapPinned, 'live_tracking'),
    section('maintenance', t('saas.nav.maintenance'), Wrench, 'fleet_maintenance'),
    {
      key: 'subscription',
      label: t('saas.nav.subscription'),
      icon: icon(CreditCard),
      href: '/app/subscription',
    },
  ];

  const company = context?.membership;
  const subscription = context?.subscription;
  const banners: ReactNode[] = [];
  if (company?.status === 'pending') {
    banners.push(
      <Alert key="pending" title={t('company.pending.title')}>
        {t('company.pending.text')}
      </Alert>,
    );
  } else if (company?.status === 'suspended') {
    banners.push(
      <Alert key="suspended" tone="danger" title={t('company.suspended.title')}>
        {t('company.suspended.text')}
      </Alert>,
    );
  }
  const offersLink = (
    <Link href="/app/subscription" className="font-semibold underline">
      {t('subscription.seeOffers')}
    </Link>
  );
  if (context && !context.canWrite) {
    // Q21: ended trial or subscription = read-only.
    banners.push(
      <Alert key="read-only" tone="danger">
        {t('subscription.readOnlyBanner')} {offersLink}
      </Alert>,
    );
  } else if (subscription?.status === 'past_due') {
    // Q22: full access during the grace period, then cancellation.
    banners.push(
      <Alert key="past-due" tone="danger">
        {t('subscription.pastDueBanner', { days: subscription.graceDaysLeft })} {offersLink}
      </Alert>,
    );
  } else if (subscription?.status === 'trial' && subscription.trialEndsAt) {
    banners.push(
      <Alert key="trial">
        {t('subscription.trialBanner', {
          days: trialDaysLeft(subscription.trialEndsAt, new Date()),
        })}{' '}
        <Link href="/app/subscription" className="font-semibold underline">
          {t('subscription.seeOffers')}
        </Link>
      </Alert>,
    );
  }

  return (
    <AppShell
      title={t('saas.title')}
      navLabel={t('nav.main')}
      logoAlt={t('brand.logoAlt')}
      items={company ? items : []}
      context={company?.legalName}
      topbar={<UserMenu name={user.fullName} />}
      banner={banners.length > 0 ? banners : undefined}
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
