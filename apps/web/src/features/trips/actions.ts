'use server';

import {
  can,
  cancelTripSchema,
  casablancaLocalToUtc,
  parseMoneyInput,
  tripSchema,
  type TripInput,
} from '@mtr/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCompanyContext } from '@/features/companies/context';
import { fail, fromDbError, type FormResult } from '@/lib/action-result';
import { createClient } from '@/lib/supabase/server';

/**
 * Trip writes (step 9). The company comes from the session (rule 11); the database trigger
 * enforces the status machine, the conflicts, the override rights and the license rule.
 */
async function tripContext(id?: string): Promise<{ error: FormResult } | { companyId: string }> {
  if (id !== undefined && !z.uuid().safeParse(id).success) return { error: fail('forbidden') };
  const context = await getCompanyContext();
  if (!context || !can(context.membership.role, 'trips.manage'))
    return { error: fail('forbidden') };
  if (!context.canWrite) return { error: fail('readOnly') };
  return { companyId: context.membership.companyId };
}

const done = (id?: string): FormResult => {
  revalidatePath('/', 'layout');
  return { ok: true, id };
};

function tripRow(input: TripInput) {
  const parsed = tripSchema.safeParse(input);
  if (!parsed.success) return null;
  const value = parsed.data;
  return {
    client_id: value.clientId || null,
    passenger_name: value.passengerName,
    passenger_phone: value.passengerPhone || null,
    passengers: value.passengers,
    luggage: value.luggage,
    pickup_city_id: value.pickupCityId,
    pickup_address: value.pickupAddress,
    dropoff_city_id: value.dropoffCityId,
    dropoff_address: value.dropoffAddress,
    // Typed in Morocco time, stored in UTC (rule 9).
    starts_at: casablancaLocalToUtc(value.startsAt).toISOString(),
    ends_at: casablancaLocalToUtc(value.endsAt).toISOString(),
    price_cents: parseMoneyInput(value.price) ?? null,
    vehicle_id: value.vehicleId || null,
    driver_id: value.driverId || null,
    notes: value.notes || null,
    conflict_override: value.conflictOverride,
    override_reason: value.conflictOverride ? value.overrideReason : null,
  };
}

export async function createTripAction(input: TripInput): Promise<FormResult> {
  const context = await tripContext();
  if ('error' in context) return context.error;
  const row = tripRow(input);
  if (!row) return fail('invalid');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trips')
    .insert({ company_id: context.companyId, status: 'planned', ...row })
    .select('id')
    .single();
  return error ? fromDbError(error) : done(data.id);
}

export async function updateTripAction(id: string, input: TripInput): Promise<FormResult> {
  const context = await tripContext(id);
  if ('error' in context) return context.error;
  const row = tripRow(input);
  if (!row) return fail('invalid');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trips')
    .update(row)
    .eq('id', id)
    .eq('company_id', context.companyId)
    .select('id');
  if (error) return fromDbError(error);
  return data.length ? done(id) : fail('forbidden');
}

export async function setTripProgressAction(
  id: string,
  status: 'in_progress' | 'completed',
): Promise<FormResult> {
  const context = await tripContext(id);
  if ('error' in context) return context.error;
  if (status !== 'in_progress' && status !== 'completed') return fail('invalid');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trips')
    .update({ status })
    .eq('id', id)
    .eq('company_id', context.companyId)
    .select('id');
  if (error) return fromDbError(error);
  return data.length ? done(id) : fail('forbidden');
}

export async function cancelTripAction(id: string, reason: string): Promise<FormResult> {
  const context = await tripContext(id);
  if ('error' in context) return context.error;
  const parsed = cancelTripSchema.safeParse({ reason });
  if (!parsed.success) return fail('invalid');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trips')
    .update({ status: 'cancelled', cancel_reason: parsed.data.reason })
    .eq('id', id)
    .eq('company_id', context.companyId)
    .select('id');
  if (error) return fromDbError(error);
  return data.length ? done(id) : fail('forbidden');
}
