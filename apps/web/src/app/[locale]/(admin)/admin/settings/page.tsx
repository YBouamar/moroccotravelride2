import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SettingsForm } from '@/features/admin/components/settings-form';
import { getPlatformSettings } from '@/features/settings/queries';
import { asLocale } from '@/i18n/as-locale';

export async function generateMetadata() {
  const t = await getTranslations('admin.settings');
  return { title: t('title') };
}

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale(asLocale((await params).locale));
  const [t, settings] = await Promise.all([
    getTranslations('admin.settings'),
    getPlatformSettings(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <SettingsForm
        paymentInfo={settings.subscription_payment_info}
        graceDays={settings.subscription_grace_days}
      />
    </div>
  );
}
