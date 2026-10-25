'use server';

import {
  bpsToRate,
  paymentInfoSchema,
  percentToBps,
  PLAN_CODES,
  SUBSCRIPTION_STATUSES,
} from '@mtr/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export type AdminActionResult =
  { ok: true } | { ok: false; error: 'invalid' | 'forbidden' | 'unknown' };

const companyId = z.uuid();
const optionalDate = z.union([z.iso.date(), z.literal('')]).transform((value) => value || null);

/**
 * Every admin action runs as the signed-in user: RLS (is_platform_admin + aal2) decides.
 * An update that RLS filters out touches no row, which we report as forbidden.
 */
async function adminUpdate(
  run: (supabase: Awaited<ReturnType<typeof createClient>>) => PromiseLike<{
    data: unknown[] | null;
    error: { code?: string } | null;
  }>,
): Promise<AdminActionResult> {
  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== 'aal2') return { ok: false, error: 'forbidden' };

  const { data, error } = await run(supabase);
  if (error) {
    console.error('admin update failed', error.code);
    return { ok: false, error: error.code === '42501' ? 'forbidden' : 'unknown' };
  }
  if (!data || data.length === 0) return { ok: false, error: 'forbidden' };
  revalidatePath('/', 'layout');
  return { ok: true };
}

const statusSchema = z.object({ companyId, status: z.enum(['pending', 'verified', 'suspended']) });

export async function setCompanyStatusAction(input: z.input<typeof statusSchema>) {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' } as const;
  return adminUpdate((supabase) =>
    supabase
      .from('companies')
      .update({ status: parsed.data.status })
      .eq('id', parsed.data.companyId)
      .select('id'),
  );
}

const suspensionSchema = z.object({
  companyId,
  // Empty reason = lift the suspension.
  reason: z.string().trim().max(300),
});

export async function setMarketplaceSuspensionAction(input: z.input<typeof suspensionSchema>) {
  const parsed = suspensionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' } as const;
  const suspend = parsed.data.reason.length > 0;
  return adminUpdate((supabase) =>
    supabase
      .from('companies')
      .update({
        marketplace_suspended_at: suspend ? new Date().toISOString() : null,
        marketplace_suspension_reason: suspend ? parsed.data.reason : null,
      })
      .eq('id', parsed.data.companyId)
      .select('id'),
  );
}

const commissionSchema = z.object({ companyId, percent: z.string() });

export async function setCommissionRateAction(input: z.input<typeof commissionSchema>) {
  const parsed = commissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' } as const;
  const trimmed = parsed.data.percent.trim();
  // Empty = back to the platform default rate.
  const bps = trimmed === '' ? null : percentToBps(trimmed);
  if (trimmed !== '' && bps === null) return { ok: false, error: 'invalid' } as const;
  return adminUpdate((supabase) =>
    supabase
      .from('companies')
      .update({ commission_rate: bps === null ? null : bpsToRate(bps) })
      .eq('id', parsed.data.companyId)
      .select('id'),
  );
}

const subscriptionSchema = z
  .object({
    companyId,
    planCode: z.enum(PLAN_CODES),
    status: z.enum(SUBSCRIPTION_STATUSES),
    trialEndsAt: optionalDate,
    periodStart: optionalDate,
    periodEnd: optionalDate,
  })
  .refine((value) => value.status !== 'trial' || value.trialEndsAt !== null, {
    path: ['trialEndsAt'],
  })
  .refine(
    (value) => !value.periodStart || !value.periodEnd || value.periodEnd >= value.periodStart,
    { path: ['periodEnd'] },
  );

export async function updateSubscriptionAction(input: z.input<typeof subscriptionSchema>) {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' } as const;
  const value = parsed.data;
  return adminUpdate((supabase) =>
    supabase
      .from('subscriptions')
      .update({
        plan_code: value.planCode,
        status: value.status,
        // A trial ends at the end of the chosen day in Morocco (UTC+1 outside Ramadan).
        trial_ends_at: value.trialEndsAt ? `${value.trialEndsAt}T23:59:59+01:00` : null,
        current_period_start: value.periodStart,
        current_period_end: value.periodEnd,
      })
      .eq('company_id', value.companyId)
      .select('company_id'),
  );
}

const settingsSchema = z.object({
  paymentInfo: paymentInfoSchema,
  graceDays: z.number().int().min(1).max(90),
});

/** Platform settings edited in the admin Settings page (Q22 grace period, Q23 payment details). */
export async function updatePlatformSettingsAction(input: z.input<typeof settingsSchema>) {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' } as const;

  const payment = await adminUpdate((supabase) =>
    supabase
      .from('platform_settings')
      .update({ value: parsed.data.paymentInfo })
      .eq('key', 'subscription_payment_info')
      .select('key'),
  );
  if (!payment.ok) return payment;
  return adminUpdate((supabase) =>
    supabase
      .from('platform_settings')
      .update({ value: parsed.data.graceDays })
      .eq('key', 'subscription_grace_days')
      .select('key'),
  );
}

const reviewSchema = z
  .object({
    documentId: z.uuid(),
    decision: z.enum(['approved', 'rejected']),
    reason: z.string().trim().max(500),
  })
  // A rejection always tells the carrier why.
  .refine((value) => value.decision === 'approved' || value.reason.length > 0, {
    path: ['reason'],
  });

export async function reviewDocumentAction(input: z.input<typeof reviewSchema>) {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' } as const;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return adminUpdate((client) =>
    client
      .from('company_documents')
      .update({
        verification_status: parsed.data.decision,
        rejection_reason: parsed.data.decision === 'rejected' ? parsed.data.reason : null,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.documentId)
      .select('id'),
  );
}

export type DocumentUrlResult = { ok: true; url: string } | { ok: false; error: 'forbidden' };

/** Short-lived signed link (5 minutes) to a private company document (docs/SECURITY.md 2.4). */
export async function getDocumentUrlAction(documentId: string): Promise<DocumentUrlResult> {
  if (!z.uuid().safeParse(documentId).success) return { ok: false, error: 'forbidden' };
  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== 'aal2') return { ok: false, error: 'forbidden' };

  const { data: document } = await supabase
    .from('company_documents')
    .select('storage_path')
    .eq('id', documentId)
    .maybeSingle();
  if (!document) return { ok: false, error: 'forbidden' };

  const { data, error } = await supabase.storage
    .from('company-documents')
    .createSignedUrl(document.storage_path, 300);
  if (error || !data) return { ok: false, error: 'forbidden' };
  return { ok: true, url: data.signedUrl };
}
