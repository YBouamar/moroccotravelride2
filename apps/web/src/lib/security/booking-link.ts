import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Magic link of a guest booking (BR-014): `{ref}.{expiry}.{signature}` signed with HMAC-SHA256.
 * Whoever holds the link (sent to the traveler's e-mail) can see and cancel that booking only.
 * No database lookup is needed to reject a forged or expired link.
 */

const SEPARATOR = '.';

function sign(secret: string, ref: string, email: string, expiresAt: number): string {
  return createHmac('sha256', secret)
    .update(`booking-link:${ref}:${email.toLowerCase()}:${expiresAt}`)
    .digest('base64url');
}

export function createBookingToken(input: {
  secret: string;
  ref: string;
  email: string;
  expiresAt: Date;
}): string {
  const expiry = Math.floor(input.expiresAt.getTime() / 1000);
  return [expiry, sign(input.secret, input.ref, input.email, expiry)].join(SEPARATOR);
}

/** True when the token was issued for this booking and e-mail and has not expired. */
export function verifyBookingToken(input: {
  secret: string;
  ref: string;
  email: string;
  token: string;
  now?: Date;
}): boolean {
  const [expiryText, signature, extra] = input.token.split(SEPARATOR);
  if (!expiryText || !signature || extra !== undefined || !/^\d{1,12}$/.test(expiryText))
    return false;
  const expiry = Number(expiryText);
  if (expiry * 1000 < (input.now ?? new Date()).getTime()) return false;
  const expected = Buffer.from(sign(input.secret, input.ref, input.email, expiry));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Links stay valid 30 days after the pickup (receipts, disputes), then expire. */
export const bookingLinkExpiry = (pickupAt: Date) =>
  new Date(pickupAt.getTime() + 30 * 24 * 60 * 60 * 1000);
