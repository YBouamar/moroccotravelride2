import { Building2, ClipboardList, Gauge, Percent, Settings } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell, type ShellNavItem } from '@/components/layout/app-shell';
import { UserMenu } from '@/features/auth/components/user-menu';
import { requireUser } from '@/features/auth/session';
import { asLocale } from '@/i18n/as-locale';
import { createClient } from '@/lib/supabase/server';

interface AdminLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

const icon = (Icon: typeof Gauge) => <Icon className="size-4 shrink-0" />;

// Platform admins only, with MFA validated in this session (aal2). RLS enforces the same rule.
export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const locale = asLocale((await params).locale);
  const user = await requireUser(locale);
  // Do not reveal that the admin area exists.
  if (!user.isPlatformAdmin) notFound();

  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== 'aal2') redirect(`/${locale}/mfa`);

  const t = await getTranslations();
  const items: ShellNavItem[] = [
    { key: 'overview', label: t('admin.nav.overview'), icon: icon(Gauge), href: '/admin' },
    {
      key: 'companies',
      label: t('admin.nav.companies'),
      icon: icon(Building2),
      href: '/admin/companies',
    },
    {
      key: 'bookings',
      label: t('admin.nav.bookings'),
      icon: icon(ClipboardList),
      badge: t('saas.soon'),
    },
    {
      key: 'commissions',
      label: t('admin.nav.commissions'),
      icon: icon(Percent),
      badge: t('saas.soon'),
    },
    {
      key: 'settings',
      label: t('admin.nav.settings'),
      icon: icon(Settings),
      badge: t('saas.soon'),
    },
  ];

  return (
    <AppShell
      title={t('admin.title')}
      navLabel={t('nav.main')}
      logoAlt={t('brand.logoAlt')}
      items={items}
      topbar={<UserMenu name={user.fullName} />}
    >
      {children}
    </AppShell>
  );
}
