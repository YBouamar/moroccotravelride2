import 'server-only';
import { PLAN_CODES, type Feature, type PlanCode } from '@mtr/shared';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export interface Plan {
  code: PlanCode;
  monthlyPriceCents: number | null;
  features: Feature[];
}

/** Public offers with their features, cheapest first (RLS: readable by everyone). */
export const getPlans = cache(async (): Promise<Plan[]> => {
  const supabase = await createClient();
  const [{ data: plans, error }, { data: features, error: featuresError }] = await Promise.all([
    supabase.from('plans').select('code, monthly_price_cents, sort_order').order('sort_order'),
    supabase.from('plan_features').select('plan_code, feature_key'),
  ]);
  if (error) throw error;
  if (featuresError) throw featuresError;

  return (plans ?? [])
    .filter((plan): plan is typeof plan & { code: PlanCode } =>
      (PLAN_CODES as readonly string[]).includes(plan.code),
    )
    .map((plan) => ({
      code: plan.code,
      monthlyPriceCents: plan.monthly_price_cents,
      features: (features ?? [])
        .filter((row) => row.plan_code === plan.code)
        .map((row) => row.feature_key as Feature),
    }));
});

/** Cheapest offer that includes a feature (used for "available in V2" badges). */
export function lowestPlanWith(plans: Plan[], feature: Feature): PlanCode | undefined {
  return plans.find((plan) => plan.features.includes(feature))?.code;
}
