import { LayoutDashboard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { asLocale } from '@/i18n/as-locale';
import { EmptyState } from '@/components/ui/empty-state';

export default function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(asLocale(use(params).locale));
  const t = useTranslations('saas.dashboard');
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">{t('title')}</h1>
      <EmptyState icon={LayoutDashboard} title={t('empty.title')} description={t('empty.text')} />
    </>
  );
}
