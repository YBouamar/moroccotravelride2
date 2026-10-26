'use server';

import {
  can,
  clientSchema,
  driverSchema,
  vehicleSchema,
  type ClientInput,
  type DriverInput,
  type Permission,
  type VehicleInput,
} from '@mtr/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCompanyContext } from '@/features/companies/context';
import { fail, fromDbError, type FormResult } from '@/lib/action-result';
import { createClient } from '@/lib/supabase/server';
import { DRIVER_STATUSES, VEHICLE_STATUSES } from './constants';

/**
 * Edits of vehicles, drivers and clients (step 8). Creation of vehicles and drivers reuses the
 * onboarding actions. The company comes from the session (CLAUDE.md rule 11) and RLS enforces
 * the role and the active offer (ADR-022).
 */
async function writeContext(
  permission: Permission,
  id?: string,
): Promise<{ error: FormResult } | { companyId: string }> {
  if (id !== undefined && !z.uuid().safeParse(id).success) return { error: fail('forbidden') };
  const context = await getCompanyContext();
  if (!context || !can(context.membership.role, permission)) return { error: fail('forbidden') };
  if (!context.canWrite) return { error: fail('readOnly') };
  return { companyId: context.membership.companyId };
}

const done = (): FormResult => {
  revalidatePath('/', 'layout');
  return { ok: true };
};

/** Updates exactly one row of the current company; zero rows means RLS refused it. */
const oneRow = (result: { error: { code?: string } | null; data: unknown[] | null }) => {
  if (result.error) return fromDbError(result.error);
  return result.data?.length ? done() : fail('forbidden');
};

export async function updateVehicleAction(id: string, input: VehicleInput): Promise<FormResult> {
  const context = await writeContext('vehicles.manage', id);
  if ('error' in context) return context.error;
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  const value = parsed.data;

  const supabase = await createClient();
  return oneRow(
    await supabase
      .from('vehicles')
      .update({
        registration: value.registration,
        brand: value.brand,
        model: value.model,
        vehicle_type_code: value.vehicleTypeCode,
        seats: value.seats,
        luggage_capacity: value.luggageCapacity,
        year: value.year,
      })
      .eq('id', id)
      .eq('company_id', context.companyId)
      .select('id'),
  );
}

export async function setVehicleStatusAction(id: string, status: string): Promise<FormResult> {
  const context = await writeContext('vehicles.manage', id);
  if ('error' in context) return context.error;
  const parsed = z.enum(VEHICLE_STATUSES).safeParse(status);
  if (!parsed.success) return fail('invalid');

  const supabase = await createClient();
  return oneRow(
    await supabase
      .from('vehicles')
      .update({ status: parsed.data })
      .eq('id', id)
      .eq('company_id', context.companyId)
      .select('id'),
  );
}

export async function updateDriverAction(id: string, input: DriverInput): Promise<FormResult> {
  const context = await writeContext('drivers.manage', id);
  if ('error' in context) return context.error;
  const parsed = driverSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  const value = parsed.data;

  const supabase = await createClient();
  return oneRow(
    await supabase
      .from('drivers')
      .update({
        full_name: value.fullName,
        phone: value.phone,
        license_number: value.licenseNumber,
        license_expires_on: value.licenseExpiresOn,
        professional_card_number: value.professionalCardNumber || null,
        professional_card_expires_on: value.professionalCardExpiresOn || null,
        languages: value.languages,
      })
      .eq('id', id)
      .eq('company_id', context.companyId)
      .select('id'),
  );
}

export async function setDriverStatusAction(id: string, status: string): Promise<FormResult> {
  const context = await writeContext('drivers.manage', id);
  if ('error' in context) return context.error;
  const parsed = z.enum(DRIVER_STATUSES).safeParse(status);
  if (!parsed.success) return fail('invalid');

  const supabase = await createClient();
  return oneRow(
    await supabase
      .from('drivers')
      .update({ status: parsed.data })
      .eq('id', id)
      .eq('company_id', context.companyId)
      .select('id'),
  );
}

const clientRow = (value: z.output<typeof clientSchema>) => ({
  type: value.type,
  name: value.name,
  ice: value.ice || null,
  email: value.email || null,
  phone: value.phone || null,
  address: value.address || null,
  notes: value.notes || null,
});

export async function createClientAction(input: ClientInput): Promise<FormResult> {
  const context = await writeContext('clients.manage');
  if ('error' in context) return context.error;
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .insert({ company_id: context.companyId, ...clientRow(parsed.data) })
    .select('id')
    .single();
  if (error) return fromDbError(error);
  revalidatePath('/', 'layout');
  return { ok: true, id: data.id };
}

export async function updateClientAction(id: string, input: ClientInput): Promise<FormResult> {
  const context = await writeContext('clients.manage', id);
  if ('error' in context) return context.error;
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');

  const supabase = await createClient();
  return oneRow(
    await supabase
      .from('clients')
      .update(clientRow(parsed.data))
      .eq('id', id)
      .eq('company_id', context.companyId)
      .select('id'),
  );
}

export async function setClientActiveAction(id: string, active: boolean): Promise<FormResult> {
  const context = await writeContext('clients.manage', id);
  if ('error' in context) return context.error;

  const supabase = await createClient();
  return oneRow(
    await supabase
      .from('clients')
      .update({ is_active: active === true })
      .eq('id', id)
      .eq('company_id', context.companyId)
      .select('id'),
  );
}
