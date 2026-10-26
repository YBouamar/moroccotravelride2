import { z } from 'zod';

/**
 * Carrier data schemas shared by forms and Server Actions (step 7). Error messages are i18n keys
 * under `validation.*`. Legal identifiers follow the Moroccan formats; the full list of mandatory
 * invoice mentions remains À VÉRIFIER with an accountant (BR-109).
 * Expiry dates in the past are accepted and only warned about (Q24, see validity.ts).
 */

const optionalText = (max: number) => z.string().trim().max(max, { error: 'tooLong' });
const requiredText = (max: number) =>
  z.string().trim().min(1, { error: 'required' }).max(max, { error: 'tooLong' });
const isoDate = z.iso.date({ error: 'date' });

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ]{8,20}$/, { error: 'phone' });

export const companyProfileSchema = z.object({
  legalName: z.string().trim().min(2, { error: 'nameTooShort' }).max(200, { error: 'tooLong' }),
  tradeName: optionalText(200),
  // Identifiant Commun de l'Entreprise: 15 digits.
  ice: z
    .string()
    .trim()
    .regex(/^\d{15}$/, { error: 'ice' }),
  ifNumber: requiredText(32),
  rcNumber: requiredText(32),
  tpNumber: optionalText(32),
  address: requiredText(300),
  cityId: z.uuid({ error: 'required' }),
  licenseNumber: requiredText(64),
  licenseExpiresOn: isoDate,
});

/** Upper case, single spaces: "12345 - a - 6 " becomes "12345 - A - 6". */
export function normalizeRegistration(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

const currentYear = () => new Date().getFullYear();

export const vehicleSchema = z.object({
  registration: z
    .string()
    .transform(normalizeRegistration)
    // Latin or Arabic letters, digits, dashes and spaces (e.g. 12345-A-6, 12345-أ-6, WW 123456).
    .pipe(z.string().regex(/^[0-9A-Z؀-ۿ\- ]{2,20}$/, { error: 'registration' })),
  brand: requiredText(60),
  model: requiredText(60),
  vehicleTypeCode: z.string().min(1, { error: 'required' }),
  seats: z
    .number({ error: 'required' })
    .int()
    .min(1, { error: 'seats' })
    .max(80, { error: 'seats' }),
  luggageCapacity: z.number().int().min(0).max(200).nullable(),
  year: z
    .number()
    .int()
    .min(1980, { error: 'year' })
    .refine((value) => value <= currentYear() + 1, { error: 'year' })
    .nullable(),
});

export const DRIVER_LANGUAGES = ['fr', 'en', 'ar', 'es', 'de', 'it', 'zgh'] as const;
export type DriverLanguage = (typeof DRIVER_LANGUAGES)[number];

export const driverSchema = z.object({
  fullName: z.string().trim().min(2, { error: 'nameTooShort' }).max(120, { error: 'tooLong' }),
  phone: phoneSchema,
  licenseNumber: requiredText(40),
  licenseExpiresOn: isoDate,
  professionalCardNumber: optionalText(40),
  professionalCardExpiresOn: z.union([z.literal(''), isoDate]),
  languages: z.array(z.enum(DRIVER_LANGUAGES)),
});

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type DriverInput = z.infer<typeof driverSchema>;

export const CLIENT_TYPES = ['b2b', 'b2c'] as const;

export const clientSchema = z
  .object({
    type: z.enum(CLIENT_TYPES),
    name: z.string().trim().min(2, { error: 'nameTooShort' }).max(200, { error: 'tooLong' }),
    ice: z.union([
      z.literal(''),
      z
        .string()
        .trim()
        .regex(/^\d{15}$/, { error: 'ice' }),
    ]),
    email: z.union([z.literal(''), z.email({ error: 'email' })]),
    phone: z.union([z.literal(''), phoneSchema]),
    address: optionalText(300),
    notes: optionalText(1000),
  })
  // The ICE only applies to companies (B2B); it is dropped for individuals.
  .transform((value) => (value.type === 'b2c' ? { ...value, ice: '' } : value));

export type ClientInput = z.input<typeof clientSchema>;
