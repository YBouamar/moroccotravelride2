import { can } from '@mtr/shared';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { getCompanyContext } from '@/features/companies/context';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { LiveMap } from '@/features/tracking/components/live-map';
import { getLiveTrips } from '@/features/tracking/queries';
import { asLocale } from '@/i18n/as-locale';

export async function generateMetadata() {
  const t = await getTranslations('tracking');
  return { title: t('title') };
}

export default async function TrackingPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, context] = await Promise.all([getTranslations(), getCompanyContext()]);
  if (!context || !can(context.membership.role, 'tracking.read'))
    return <Alert>{t('lists.forbidden')}</Alert>;
  const trips = context.features.has('live_tracking')
    ? await getLiveTrips(context.membership.companyId, locale)
    : [];

  return (
    <FeatureGate feature="live_tracking">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">{t('tracking.title')}</h1>
        <p className="text-sm text-muted">{t('tracking.help')}</p>
        <LiveMap initial={trips} />
      </div>
    </FeatureGate>
  );
}
