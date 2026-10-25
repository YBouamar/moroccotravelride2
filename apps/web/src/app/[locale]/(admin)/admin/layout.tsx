import { Building2, ClipboardList, Gauge, Percent, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { AppShell, type ShellNavItem } from '@/components/layout/app-shell';

// platform_admin + MFA (aal2) check is added with auth in step 5.
export default function AdminLayout({ children }: { children: ReactNode }) {
  const t = useTranslations();
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
    >
      {children}
    </AppShell>
  );
}
