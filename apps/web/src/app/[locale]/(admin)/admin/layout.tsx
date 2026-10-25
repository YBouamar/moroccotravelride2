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
    { key: 'overview', label: t('admin.nav.overview'), icon: Gauge, href: '/admin', active: true },
    { key: 'companies', label: t('admin.nav.companies'), icon: Building2 },
    { key: 'bookings', label: t('admin.nav.bookings'), icon: ClipboardList },
    { key: 'commissions', label: t('admin.nav.commissions'), icon: Percent },
    { key: 'settings', label: t('admin.nav.settings'), icon: Settings },
  ];

  return (
    <AppShell
      title={t('admin.title')}
      navLabel={t('nav.main')}
      soonLabel={t('saas.soon')}
      logoAlt={t('brand.logoAlt')}
      items={items}
      topbar={<UserMenu name={user.fullName} />}
    >
      {children}
    </AppShell>
  );
}
