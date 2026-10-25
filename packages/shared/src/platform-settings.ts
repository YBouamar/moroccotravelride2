import { z } from 'zod';
import { BPS_PER_UNIT } from './money';

const bps = z.number().int().min(0).max(BPS_PER_UNIT);
const positiveInt = z.number().int().positive();

/** Moroccan RIB: 24 digits (spaces ignored). Empty while the admin has not filled it in. */
const ribSchema = z
  .string()
  .transform((value) => value.replace(/\s/g, ''))
  .pipe(z.union([z.literal(''), z.string().regex(/^\d{24}$/, { error: 'rib' })]));

/** Platform payment details for subscriptions (Q23), edited in the admin settings page. */
export const paymentInfoSchema = z.object({
  bank_name: z.string().trim().max(100, { error: 'tooLong' }),
  account_holder: z.string().trim().max(150, { error: 'tooLong' }),
  rib: ribSchema,
  email: z.union([z.literal(''), z.email({ error: 'email' })]),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9 ]{8,20})?$/, { error: 'phone' }),
});

export type PaymentInfo = z.infer<typeof paymentInfoSchema>;

/** Shapes of platform_settings values (seeded by migration 20261025210200). */
export const platformSettingsSchema = z.object({
  default_commission_bps: bps,
  min_booking_lead_hours: positiveInt,
  carrier_accept_hours: positiveInt,
  cancellation_policy: z.object({
    tiers: z
      .array(z.object({ min_hours_before: z.number().int().min(0), refund_bps: bps }))
      .min(1)
      // Tiers ordered from the most to the least generous, ending at 0 hours.
      .refine(
        (tiers) =>
          tiers.every(
            (tier, i) => i === 0 || tier.min_hours_before < tiers[i - 1]!.min_hours_before,
          ) && tiers.at(-1)?.min_hours_before === 0,
        { message: 'tiers must be strictly decreasing and end at 0 hours' },
      ),
  }),
  statement_suspension_days: positiveInt,
  location_retention_days: positiveInt,
  saas_trial: z.object({ days: positiveInt, plan: z.enum(['standard', 'v2', 'v3']) }),
  marketplace_open: z.boolean(),
  subscription_grace_days: positiveInt,
  subscription_payment_info: paymentInfoSchema,
});

export type PlatformSettings = z.infer<typeof platformSettingsSchema>;

/** Builds typed settings from the platform_settings rows; throws if a key is missing or invalid. */
export function parsePlatformSettings(rows: { key: string; value: unknown }[]): PlatformSettings {
  return platformSettingsSchema.parse(Object.fromEntries(rows.map((row) => [row.key, row.value])));
}
