import 'server-only';
import { cookies } from 'next/headers';

/**
 * The guest booking token lives in an HttpOnly cookie scoped to one booking, never in a URL the
 * server sees (security audit 2026-10-26, finding 5): e-mails carry it in the fragment (#t=...),
 * which browsers never send; the page exchanges it for this cookie once.
 */

const name = (ref: string) => `mtr_booking_${ref.replace(/[^A-Z0-9-]/g, '')}`;

export async function setBookingCookie(ref: string, token: string) {
  const expirySeconds = Number(token.split('.')[0]);
  (await cookies()).set(name(ref), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: Number.isFinite(expirySeconds) ? new Date(expirySeconds * 1000) : undefined,
  });
}

export async function readBookingCookie(ref: string): Promise<string> {
  return (await cookies()).get(name(ref))?.value ?? '';
}
