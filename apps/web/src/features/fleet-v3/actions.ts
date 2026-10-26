'use server';

import {
  can,
  deadlineSchema,
  fuelSchema,
  litresToCentilitres,
  maintenanceSchema,
  parseMoneyInput,
  type Feature,
  type Permission,
} from '@mtr/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCompanyContext } from '@/features/companies/context';
import { fail, fromDbError, type FormResult } from '@/lib/action-result';
import { createClient } from '@/lib/supabase/server';

/**
 * V3 fleet management (Phase 5). The company comes from the session (rule 11); RLS checks the
 * role and the V3 offer (private.has_feature) again.
 */
async function v3Context(
  permission: Permission,
  feature: Feature,
): Promise<{ error: FormResult } | { companyId: string }> {
  const context = await getCompanyContext();
  if (!context || !can(context.membership.role, permission)) return { error: fail('forbidden') };
  if (!context.canWrite || !context.features.has(feature)) return { error: fail('readOnly') };
  return { companyId: context.membership.companyId };
}

const field = (data: FormData, name: string) => String(data.get(name) ?? '');
const done = (): FormResult => {
  revalidatePath('/', 'layout');
  return { ok: true };
};

export async function addDeadlineAction(data: FormData): Promise<FormResult> {
  const context = await v3Context('fleet.manage', 'vehicle_deadlines');
  if ('error' in context) return context.error;
  const parsed = deadlineSchema.safeParse({
    vehicleId: field(data, 'vehicleId'),
    kind: field(data, 'kind'),
    label: field(data, 'label'),
    dueOn: field(data, 'dueOn'),
  });
  if (!parsed.success) return fail('invalid');
  const supabase = await createClient();
  const { error } = await supabase.from('vehicle_deadlines').insert({
    company_id: context.companyId,
    vehicle_id: parsed.data.vehicleId,
    kind: parsed.data.kind,
    label: parsed.data.label || null,
    due_on: parsed.data.dueOn,
  });
  return error ? fromDbError(error) : done();
}

export async function completeDeadlineAction(id: string): Promise<FormResult> {
  if (!z.uuid().safeParse(id).success) return fail('forbidden');
  const context = await v3Context('fleet.manage', 'vehicle_deadlines');
  if ('error' in context) return context.error;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vehicle_deadlines')
    .update({ done_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', context.companyId)
    .select('id');
  if (error) return fromDbError(error);
  return data.length ? done() : fail('forbidden');
}

export async function addMaintenanceAction(data: FormData): Promise<FormResult> {
  const context = await v3Context('fleet.manage', 'fleet_maintenance');
  if ('error' in context) return context.error;
  const parsed = maintenanceSchema.safeParse({
    vehicleId: field(data, 'vehicleId'),
    kind: field(data, 'kind'),
    performedOn: field(data, 'performedOn'),
    odometerKm: field(data, 'odometerKm'),
    garage: field(data, 'garage'),
    notes: field(data, 'notes'),
    labour: field(data, 'labour') || '0',
    partName: field(data, 'partName'),
    partQuantity: field(data, 'partQuantity'),
    partCost: field(data, 'partCost'),
  });
  if (!parsed.success) return fail('invalid');
  const value = parsed.data;
  const supabase = await createClient();
  const { data: record, error } = await supabase
    .from('maintenance_records')
    .insert({
      company_id: context.companyId,
      vehicle_id: value.vehicleId,
      kind: value.kind,
      performed_on: value.performedOn,
      odometer_km: value.odometerKm ? Number(value.odometerKm) : null,
      garage: value.garage || null,
      notes: value.notes || null,
      labour_cents: parseMoneyInput(value.labour) ?? 0,
    })
    .select('id')
    .single();
  if (error) return fromDbError(error);
  if (value.partName.length >= 2 && value.partCost) {
    const part = await supabase.from('maintenance_parts').insert({
      record_id: record.id,
      company_id: context.companyId,
      name: value.partName,
      quantity: Number(value.partQuantity || '1'),
      unit_cost_cents: parseMoneyInput(value.partCost) ?? 0,
    });
    if (part.error) return fromDbError(part.error);
  }
  return done();
}

export async function addFuelLogAction(data: FormData): Promise<FormResult> {
  const context = await v3Context('fuel.manage', 'fuel_tracking');
  if ('error' in context) return context.error;
  const parsed = fuelSchema.safeParse({
    vehicleId: field(data, 'vehicleId'),
    filledOn: field(data, 'filledOn'),
    odometerKm: field(data, 'odometerKm'),
    volume: field(data, 'volume'),
    amount: field(data, 'amount'),
    fullTank: data.get('fullTank') === 'on',
  });
  if (!parsed.success) return fail('invalid');
  const supabase = await createClient();
  const { error } = await supabase.from('fuel_logs').insert({
    company_id: context.companyId,
    vehicle_id: parsed.data.vehicleId,
    filled_on: parsed.data.filledOn,
    odometer_km: Number(parsed.data.odometerKm),
    volume_cl: litresToCentilitres(parsed.data.volume)!,
    amount_cents: parseMoneyInput(parsed.data.amount) ?? 0,
    full_tank: parsed.data.fullTank,
  });
  return error ? fromDbError(error) : done();
}
