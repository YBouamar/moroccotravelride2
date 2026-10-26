'use server';

import { PUBLIC_REF_PATTERN } from '@mtr/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSessionUser } from '@/features/auth/session';
import { fail, type FormResult } from '@/lib/action-result';
import { getBookingLinkSecret } from '@/lib/env.server';
import { readBookingCookie } from '@/lib/security/booking-cookie';
import { verifyBookingToken } from '@/lib/security/booking-link';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { getClientIp } from '@/lib/security/request-context';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/** Reviews (step 27): travelers rate a completed booking through the magic link. */

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000),
});

export async function submitReviewAction(
  ref: string,
  input: z.input<typeof reviewSchema>,
): Promise<FormResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!PUBLIC_REF_PATTERN.test(ref) || !parsed.success) return fail('invalid');
  if (!(await consumeRateLimit('review-ip', await getClientIp(), 10, 60 * 60)))
    return fail('rateLimited');

  const token = await readBookingCookie(ref);
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from('bookings')
    .select('id, traveler_email')
    .eq('public_ref', ref)
    .maybeSingle();
  if (
    !booking ||
    !verifyBookingToken({
      secret: getBookingLinkSecret(),
      ref,
      email: booking.traveler_email,
      token,
    })
  ) {
    return fail('forbidden');
  }
  const { error } = await admin.rpc('submit_review', {
    p_booking: booking.id,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment,
  });
  if (error)
    return fail(
      error.code === '23505' ? 'duplicate' : error.code === 'MT024' ? 'locked' : 'unknown',
    );
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Moderation by a platform admin (RLS: admins with MFA only). */
export async function moderateReviewAction(
  reviewId: string,
  status: 'published' | 'hidden',
): Promise<FormResult> {
  const user = await getSessionUser();
  if (!user?.isPlatformAdmin || !z.uuid().safeParse(reviewId).success) return fail('forbidden');
  if (status !== 'published' && status !== 'hidden') return fail('invalid');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reviews')
    .update({ status, moderated_by: user.id, moderated_at: new Date().toISOString() })
    .eq('id', reviewId)
    .select('id');
  if (error || !data.length) return fail('forbidden');
  revalidatePath('/', 'layout');
  return { ok: true };
}
