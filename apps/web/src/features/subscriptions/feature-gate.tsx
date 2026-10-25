import type { Feature } from '@mtr/shared';
import { Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { getCompanyContext } from '@/features/companies/context';
import { Link } from '@/i18n/navigation';
import { getPlans, lowestPlanWith } from './plans';

/**
 * Shows its children only if the current company's offer includes `feature`; otherwise a locked
 * panel with a call to upgrade (BR-104). Display only: RLS (private.has_feature) is the guard.
 */
export async function FeatureGate({
  feature,
  children,
}: {
  feature: Feature;
  children: ReactNode;
}) {
  const context = await getCompanyContext();
  if (context?.features.has(feature)) return children;

  const [t, plans] = await Promise.all([getTranslations(), getPlans()]);
  const plan = lowestPlanWith(plans, feature);

  return (
    <div className="flex flex-col items-center rounded-card border border-border bg-surface px-6 py-12 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-background">
        <Lock aria-hidden="true" className="size-6 text-secondary" />
      </span>
      <h2 className="text-lg font-semibold">{t('subscription.lockedTitle')}</h2>
      <p className="mt-2 max-w-md text-sm text-muted">
        {t(`features.${feature}`)}
        {plan ? ` : ${t('subscription.lockedText', { plan: t(`plans.${plan}`) })}` : null}
      </p>
      <Link href="/app/subscription" className={buttonVariants({ className: 'mt-6' })}>
        {t('subscription.seeOffers')}
      </Link>
    </div>
  );
}
