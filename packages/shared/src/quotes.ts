import { z } from 'zod';
import { isIsoDay } from './validity';

/**
 * Quote requests (ADR-040): chauffeur hire ("mise à disposition") and organized tours are not
 * bookable online yet. The traveler sends a request, the platform answers by e-mail.
 */

export const QUOTE_KINDS = ['hourly', 'tour'] as const;
export type QuoteKind = (typeof QUOTE_KINDS)[number];

export const QUOTE_STATUSES = ['new', 'handled', 'closed'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_MAX_DAYS = 30;

export const quoteRequestSchema = z.object({
  kind: z.enum(QUOTE_KINDS),
  name: z.string().trim().min(2, { error: 'nameTooShort' }).max(120, { error: 'tooLong' }),
  email: z.email({ error: 'email' }),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{8,20}$/, { error: 'phone' }),
  fromCity: z.uuid({ error: 'required' }),
  startDate: z.string().refine(isIsoDay, { error: 'date' }),
  days: z
    .number({ error: 'required' })
    .int({ error: 'days' })
    .min(1, { error: 'days' })
    .max(QUOTE_MAX_DAYS, { error: 'days' }),
  passengers: z
    .number({ error: 'required' })
    .int({ error: 'passengers' })
    .min(1, { error: 'passengers' })
    .max(80, { error: 'passengers' }),
  message: z.string().trim().max(2000, { error: 'tooLong' }),
  acceptTerms: z.literal(true, { error: 'acceptTerms' }),
});
export type QuoteRequestInput = z.input<typeof quoteRequestSchema>;

/** A request must start after today (Morocco date, ISO strings compare in calendar order). */
export const isQuoteDateValid = (startDate: string, today: string) => startDate > today;
