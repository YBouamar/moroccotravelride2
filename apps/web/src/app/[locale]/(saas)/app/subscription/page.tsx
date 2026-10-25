import { formatMoney, trialDaysLeft } from '@mtr/shared';
import { Check } from 'lucide-react';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { getCompanyContext } from '@/features/companies/context';
import { getPlans } from '@/features/subscriptions/plans';
import { asLocale } from '@/i18n/as-locale';
import { cn } from '@/lib/utils';

export async function generateMetadata() {
  const t = await getTranslations('subscription');
  return { title: t('title') };
}

export default async function SubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, format, context, plans] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getCompanyContext(),
    getPlans(),
  ]);
  const subscription = context?.subscription;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">{t('subscription.title')}</h1>

      {subscription ? (
        <Card>
          <CardTitle>{t('subscription.currentTitle')}</CardTitle>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted">{t('subscription.plan')}</dt>
              <dd className="mt-1 text-lg font-semibold">{t(`plans.${subscription.planCode}`)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t('subscription.status')}</dt>
              <dd className="mt-1">
                <Badge variant={subscription.usable ? 'verified' : 'neutral'}>
                  {t(`subscriptionStatus.${subscription.status}`)}
                </Badge>
              </dd>
            </div>
            <div className="text-sm">
              {subscription.status === 'trial' && subscription.trialEndsAt ? (
                <p>
                  {t('subscription.trialLeft', {
                    days: trialDaysLeft(subscription.trialEndsAt, new Date()),
                  })}
                </p>
              ) : subscription.currentPeriodEnd ? (
                <p>
                  {t('subscription.periodEnd', {
                    date: format.dateTime(new Date(subscription.currentPeriodEnd), {
                      dateStyle: 'long',
                    }),
                  })}
                </p>
              ) : null}
            </div>
          </dl>
        </Card>
      ) : null}

      <section aria-labelledby="compare-title">
        <h2 id="compare-title" className="text-xl font-bold">
          {t('subscription.compareTitle')}
        </h2>
        <ul className="mt-4 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const current = plan.code === subscription?.planCode;
            return (
              <li key={plan.code}>
                <Card className={cn('h-full', current && 'border-2 border-secondary')}>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{t(`plans.${plan.code}`)}</CardTitle>
                    {current ? <Badge variant="verified">{t('plans.current')}</Badge> : null}
                  </div>
                  <p className="mt-3 text-2xl font-bold text-primary">
                    {plan.monthlyPriceCents === null ? (
                      t('plans.onQuote')
                    ) : (
                      <>
                        {formatMoney(plan.monthlyPriceCents, locale)}{' '}
                        <span className="text-sm font-normal text-muted">
                          {t('plans.perMonth')}
                        </span>
                      </>
                    )}
                  </p>
                  <ul className="mt-4 flex flex-col gap-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                        {t(`features.${feature}`)}
                      </li>
                    ))}
                  </ul>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <Alert title={t('subscription.howToTitle')}>{t('subscription.howToText')}</Alert>
    </div>
  );
}
