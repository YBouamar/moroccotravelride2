'use server';

import {
  casablancaDate,
  isQuoteDateValid,
  QUOTE_STATUSES,
  quoteRequestSchema,
  type QuoteRequestInput,
  type QuoteStatus,
} from '@mtr/shared';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/features/auth/session';
import { fail, type FormResult } from '@/lib/action-result';
import { flushOutbox, queueEmails } from '@/lib/email/outbox';
import { getServerEnv } from '@/lib/env.server';
import { asAppLocale } from '@/lib/locale';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { getClientIp } from '@/lib/security/request-context';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/** Quote requests for chauffeur hire and organized tours (ADR-040). */

export type QuoteError = 'invalid' | 'date' | 'captcha' | 'rateLimited' | 'unknown';
export type QuoteResult = { ok: true } | { ok: false; error: QuoteError };

export async function createQuoteRequestAction(
  input: QuoteRequestInput,
  context: { locale: string; captcha?: string },
): Promise<QuoteResult> {
  const parsed = quoteRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const value = parsed.data;
  if (!isQuoteDateValid(value.startDate, casablancaDate())) return { ok: false, error: 'date' };

  const ip = await getClientIp();
  if (!(await consumeRateLimit('quote-ip', ip, 5, 60 * 60))) {
    return { ok: false, error: 'rateLimited' };
  }
  if (!(await verifyTurnstile(context.captcha, ip))) return { ok: false, error: 'captcha' };

  const locale = asAppLocale(context.locale);
  const admin = createAdminClient();
  const { data: request, error } = await admin
    .from('quote_requests')
    .insert({
      kind: value.kind,
      name: value.name,
      email: value.email,
      phone: value.phone,
      from_city_id: value.fromCity,
      start_date: value.startDate,
      days: value.days,
      passengers: value.passengers,
      message: value.message,
      locale,
    })
    .select('id, city:cities(name_fr, name_en, name_ar)')
    .single();
  if (error) {
    console.error('quote request failed', error.code);
    return { ok: false, error: 'unknown' };
  }

  const { data: admins } = await admin.rpc('platform_admin_emails');
  const site = getServerEnv().NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const payload = {
    name: value.name,
    kind: value.kind,
    date: value.startDate,
    days: String(value.days),
    passengers: String(value.passengers),
  };
  await queueEmails([
    {
      to: value.email,
      template: 'quote_request_received',
      locale,
      payload: { ...payload, city: request.city?.[`name_${locale}`] ?? '' },
    },
    ...(admins ?? []).map((to) => ({
      to,
      template: 'quote_request_new' as const,
      locale: 'fr',
      payload: { ...payload, city: request.city?.name_fr ?? '', link: `${site}/fr/admin/quotes` },
    })),
  ]);
  after(() =>
    flushOutbox().catch((cause) =>
      console.error('outbox flush failed', cause instanceof Error ? cause.name : 'unknown'),
    ),
  );
  return { ok: true };
}

/** Status change by a platform admin (RLS: admins with MFA only, status column only). */
export async function setQuoteStatusAction(id: string, status: QuoteStatus): Promise<FormResult> {
  const user = await getSessionUser();
  if (!user?.isPlatformAdmin || !z.uuid().safeParse(id).success) return fail('forbidden');
  if (!QUOTE_STATUSES.includes(status)) return fail('invalid');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('quote_requests')
    .update({ status })
    .eq('id', id)
    .select('id');
  if (error || !data.length) return fail('forbidden');
  revalidatePath('/', 'layout');
  return { ok: true };
}
