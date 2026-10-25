import { LayoutDashboard, ListChecks } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { getOfficeContext } from '@/features/onboarding/office';
import { getOnboardingData } from '@/features/onboarding/queries';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(asLocale((await params).locale));
  const [t, office] = await Promise.all([getTranslations(), getOfficeContext()]);
  // Owners and managers see the setup progress until the onboarding is complete.
  const progress = office ? (await getOnboardingData(office.membership.companyId)).progress : null;

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">{t('saas.dashboard.title')}</h1>
      {progress && !progress.completed ? (
        <Card className="mb-6 flex flex-wrap items-center gap-4">
          <ListChecks aria-hidden="true" className="size-8 shrink-0 text-secondary" />
          <div className="min-w-0 flex-1">
            <CardTitle>{t('onboarding.dashboardTitle')}</CardTitle>
            <CardDescription>
              {t('onboarding.progress', { done: progress.doneCount, total: progress.steps.length })}
            </CardDescription>
          </div>
          <Link href="/app/onboarding" className={buttonVariants()}>
            {t('onboarding.dashboardAction')}
          </Link>
        </Card>
      ) : null}
      <EmptyState
        icon={LayoutDashboard}
        title={t('saas.dashboard.empty.title')}
        description={t('saas.dashboard.empty.text')}
      />
    </>
  );
}
