/**
 * Online card payment abstraction. Postponed at launch (ADR-016): bookings are paid offline
 * (bank transfer to the carrier or cash to the driver). The interface exists so that a gateway
 * (CMI or another) can be plugged in later without touching booking logic.
 */
export interface CheckoutRequest {
  bookingId: string;
  /** Always recomputed server side from the frozen booking amounts, never read from the client. */
  amountCents: number;
  currency: 'MAD';
  idempotencyKey: string;
  returnUrl: string;
}

export interface CheckoutSession {
  providerRef: string;
  redirectUrl: string;
}

export type CallbackVerification =
  | { valid: true; providerRef: string; amountCents: number; status: 'paid' | 'failed' }
  | { valid: false; reason: string };

export interface PaymentProvider {
  readonly id: string;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  /** Must check the provider signature before anything else. */
  verifyCallback(payload: Record<string, string>): Promise<CallbackVerification>;
}
