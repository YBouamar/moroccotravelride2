/** Traveler payment methods (ADR-016). `online_card` is reserved for the postponed card gateway. */
export const PAYMENT_METHODS = ['bank_transfer', 'cash_to_driver', 'online_card'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Methods offered at launch: in both cases the carrier collects 100 % and owes the commission. */
export const OFFLINE_PAYMENT_METHODS = [
  'bank_transfer',
  'cash_to_driver',
] as const satisfies readonly PaymentMethod[];
