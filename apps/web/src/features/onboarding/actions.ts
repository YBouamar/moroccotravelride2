'use server';

import {
  ACCEPTED_DOCUMENT_MIME,
  can,
  companyProfileSchema,
  detectDocumentType,
  DOCUMENT_TYPES,
  driverSchema,
  MAX_DOCUMENT_BYTES,
  vehicleSchema,
  type CompanyProfileInput,
  type DriverInput,
  type VehicleInput,
} from '@mtr/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCompanyContext } from '@/features/companies/context';
import { getSessionUser } from '@/features/auth/session';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';

export type OnboardingError =
  | 'invalid'
  | 'forbidden'
  | 'readOnly'
  | 'duplicate'
  | 'fileMissing'
  | 'fileType'
  | 'fileSize'
  | 'rateLimited'
  | 'unknown';
export type OnboardingResult = { ok: true } | { ok: false; error: OnboardingError };

const fail = (error: OnboardingError): OnboardingResult => ({ ok: false, error });

/**
 * The company always comes from the signed-in user's membership, never from the client
 * (CLAUDE.md rule 11). Owners and managers only; RLS enforces the same rule.
 */
async function officeContext() {
  const context = await getCompanyContext();
  if (!context || !can(context.membership.role, 'company.update')) return null;
  return context;
}

const fromDbError = (error: { code?: string }): OnboardingResult => {
  if (error.code === '23505') return fail('duplicate');
  if (error.code === '42501') return fail('forbidden');
  console.error('onboarding write failed', error.code);
  return fail('unknown');
};

const done = (): OnboardingResult => {
  revalidatePath('/', 'layout');
  return { ok: true };
};

// Company details and documents stay editable in read-only mode: they are needed to be verified
// and to subscribe (ADR-023). Vehicles and drivers require write access (Q21).

export async function saveCompanyProfileAction(
  input: CompanyProfileInput,
): Promise<OnboardingResult> {
  const context = await officeContext();
  if (!context) return fail('forbidden');
  const parsed = companyProfileSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  const value = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('companies')
    .update({
      legal_name: value.legalName,
      trade_name: value.tradeName || null,
      ice: value.ice,
      if_number: value.ifNumber,
      rc_number: value.rcNumber,
      tp_number: value.tpNumber || null,
      address: value.address,
      city_id: value.cityId,
      license_number: value.licenseNumber,
      license_expires_on: value.licenseExpiresOn,
    })
    .eq('id', context.membership.companyId)
    .select('id');
  if (error) return fromDbError(error);
  return data.length > 0 ? done() : fail('forbidden');
}

const documentFieldsSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  expiresOn: z.union([z.literal(''), z.iso.date()]),
});

export async function uploadDocumentAction(formData: FormData): Promise<OnboardingResult> {
  const [context, user] = await Promise.all([officeContext(), getSessionUser()]);
  if (!context || !user) return fail('forbidden');

  const fields = documentFieldsSchema.safeParse({
    type: formData.get('type'),
    expiresOn: formData.get('expiresOn') ?? '',
  });
  if (!fields.success) return fail('invalid');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return fail('fileMissing');
  if (file.size > MAX_DOCUMENT_BYTES) return fail('fileSize');
  if (!(await consumeRateLimit('upload-user', user.id, 20, 60 * 60))) return fail('rateLimited');

  // The real type comes from the file content, not from its name or the browser's MIME type.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectDocumentType(bytes);
  if (!mime) return fail('fileType');

  const companyId = context.membership.companyId;
  const path = `${companyId}/${crypto.randomUUID()}.${ACCEPTED_DOCUMENT_MIME[mime]}`;
  const supabase = await createClient();

  const upload = await supabase.storage
    .from('company-documents')
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (upload.error) {
    console.error('document upload failed', upload.error.message);
    return fail('unknown');
  }

  const { error } = await supabase.from('company_documents').insert({
    company_id: companyId,
    type: fields.data.type,
    storage_path: path,
    expires_on: fields.data.expiresOn || null,
  });
  if (error) {
    // Never leave an orphan file behind.
    await supabase.storage.from('company-documents').remove([path]);
    return fromDbError(error);
  }
  return done();
}

export async function deleteDocumentAction(documentId: string): Promise<OnboardingResult> {
  const context = await officeContext();
  if (!context || !z.uuid().safeParse(documentId).success) return fail('forbidden');

  const supabase = await createClient();
  // RLS only lets owners and managers delete documents still pending review.
  const { data, error } = await supabase
    .from('company_documents')
    .delete()
    .eq('id', documentId)
    .eq('company_id', context.membership.companyId)
    .select('storage_path');
  if (error) return fromDbError(error);
  const removed = data[0];
  if (!removed) return fail('forbidden');
  await supabase.storage.from('company-documents').remove([removed.storage_path]);
  return done();
}

export async function createVehicleAction(input: VehicleInput): Promise<OnboardingResult> {
  const context = await officeContext();
  if (!context) return fail('forbidden');
  if (!context.canWrite) return fail('readOnly');
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  const value = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from('vehicles').insert({
    company_id: context.membership.companyId,
    registration: value.registration,
    brand: value.brand,
    model: value.model,
    vehicle_type_code: value.vehicleTypeCode,
    seats: value.seats,
    luggage_capacity: value.luggageCapacity,
    year: value.year,
  });
  return error ? fromDbError(error) : done();
}

export async function createDriverAction(input: DriverInput): Promise<OnboardingResult> {
  const context = await officeContext();
  if (!context) return fail('forbidden');
  if (!context.canWrite) return fail('readOnly');
  const parsed = driverSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  const value = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from('drivers').insert({
    company_id: context.membership.companyId,
    full_name: value.fullName,
    phone: value.phone,
    license_number: value.licenseNumber,
    license_expires_on: value.licenseExpiresOn,
    professional_card_number: value.professionalCardNumber || null,
    professional_card_expires_on: value.professionalCardExpiresOn || null,
    languages: value.languages,
  });
  return error ? fromDbError(error) : done();
}
