import 'server-only';
import {
  isSubscriptionUsable,
  type Feature,
  type PlanCode,
  type SubscriptionStatus,
} from '@mtr/shared';
import { cache } from 'react';
import { getSessionUser } from '@/features/auth/session';
import { getPlans } from '@/features/subscriptions/plans';
import { createClient } from '@/lib/supabase/server';
import { finalizePendingCompany, getMemberships, type Membership } from './memberships';

export interface CompanySubscription {
  planCode: PlanCode;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: string | null;
  usable: boolean;
}

export interface CompanyContext {
  membership: Membership;
  subscription: CompanySubscription | null;
  /** Features usable right now (empty when the trial or subscription has ended). */
  features: ReadonlySet<Feature>;
}

/**
 * Current company of the signed-in user, its subscription and usable features.
 * UI only: the database enforces the same rules (RLS + private.has_feature).
 * Cached per request so the layout and the page share one lookup.
 */
export const getCompanyContext = cache(async (): Promise<CompanyContext | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  let memberships = await getMemberships(supabase, user.id);
  if (memberships.length === 0) {
    // First visit after e-mail confirmation in another browser: create the pending company now.
    await finalizePendingCompany(supabase);
    memberships = await getMemberships(supabase, user.id);
  }
  // Multi-company selection comes later; the oldest membership is the current company.
  const membership = memberships[0];
  if (!membership) return null;

  const [{ data: row }, plans] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan_code, status, trial_ends_at, current_period_end')
      .eq('company_id', membership.companyId)
      .maybeSingle(),
    getPlans(),
  ]);

  const subscription: CompanySubscription | null = row
    ? {
        planCode: row.plan_code as PlanCode,
        status: row.status,
        trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : null,
        currentPeriodEnd: row.current_period_end,
        usable: isSubscriptionUsable(
          {
            status: row.status,
            trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : null,
          },
          new Date(),
        ),
      }
    : null;

  const plan = plans.find((candidate) => candidate.code === subscription?.planCode);
  return {
    membership,
    subscription,
    features: new Set(subscription?.usable && plan ? plan.features : []),
  };
});
