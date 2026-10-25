import 'server-only';
import {
  graceDaysLeft,
  hasWriteAccess,
  type Feature,
  type PlanCode,
  type SubscriptionStatus,
} from '@mtr/shared';
import { cache } from 'react';
import { getSessionUser } from '@/features/auth/session';
import { getPlatformSettings } from '@/features/settings/queries';
import { getPlans } from '@/features/subscriptions/plans';
import { createClient } from '@/lib/supabase/server';
import { finalizePendingCompany, getMemberships, type Membership } from './memberships';

export interface CompanySubscription {
  planCode: PlanCode;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: string | null;
  /** Days left before a past_due subscription is cancelled (Q22), 0 otherwise. */
  graceDaysLeft: number;
}

export interface CompanyContext {
  membership: Membership;
  subscription: CompanySubscription | null;
  /** Features of the company's offer: their data stays readable even when read-only (Q21). */
  features: ReadonlySet<Feature>;
  /** False when the trial or subscription has ended: the company is read-only (Q21). */
  canWrite: boolean;
}

/**
 * Current company of the signed-in user, its subscription and access level.
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

  const [{ data: row }, plans, settings] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan_code, status, trial_ends_at, current_period_end, past_due_since')
      .eq('company_id', membership.companyId)
      .maybeSingle(),
    getPlans(),
    getPlatformSettings(),
  ]);
  if (!row) return { membership, subscription: null, features: new Set(), canWrite: false };

  const now = new Date();
  const state = {
    status: row.status,
    trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : null,
    pastDueSince: row.past_due_since ? new Date(row.past_due_since) : null,
  };
  const graceDays = settings.subscription_grace_days;

  return {
    membership,
    subscription: {
      planCode: row.plan_code as PlanCode,
      status: row.status,
      trialEndsAt: state.trialEndsAt,
      currentPeriodEnd: row.current_period_end,
      graceDaysLeft:
        row.status === 'past_due' ? graceDaysLeft(state.pastDueSince, graceDays, now) : 0,
    },
    features: new Set(plans.find((plan) => plan.code === row.plan_code)?.features ?? []),
    canWrite: hasWriteAccess(state, now, graceDays),
  };
});
