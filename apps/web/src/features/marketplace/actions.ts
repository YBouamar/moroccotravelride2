'use server';

import { can, parseMoneyInput, priceGridSchema, type PriceGridInput } from '@mtr/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCompanyContext } from '@/features/companies/context';
import { fail, fromDbError, type FormResult } from '@/lib/action-result';
import { createClient } from '@/lib/supabase/server';

/**
 * Carrier marketplace settings (step 12). Owners and managers only; the company comes from the
 * session (rule 11). Not tied to the SaaS subscription: the marketplace is Pillar A.
 */
async function marketplaceContext(): Promise<{ error: FormResult } | { companyId: string }> {
  const context = await getCompanyContext();
  if (!context || !can(context.membership.role, 'marketplace.manage')) {
    return { error: fail('forbidden') };
  }
  return { companyId: context.membership.companyId };
}

const done = (): FormResult => {
  revalidatePath('/', 'layout');
  return { ok: true };
};

/** Q19: the carrier turns its visibility on or off; an admin suspension still prevails. */
export async function setMarketplaceVisibilityAction(enabled: boolean): Promise<FormResult> {
  const context = await marketplaceContext();
  if ('error' in context) return context.error;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('companies')
    .update({ marketplace_enabled: enabled === true })
    .eq('id', context.companyId)
    .select('id');
  if (error) return fromDbError(error);
  return data.length ? done() : fail('forbidden');
}

/** Adds a route price (and optionally its return). An existing route gets the new price. */
export async function savePriceGridAction(input: PriceGridInput): Promise<FormResult> {
  const context = await marketplaceContext();
  if ('error' in context) return context.error;
  const parsed = priceGridSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  const value = parsed.data;
  const price = parseMoneyInput(value.price)!;

  const row = (from: string, to: string) => ({
    company_id: context.companyId,
    from_city_id: from,
    to_city_id: to,
    vehicle_type_code: value.vehicleTypeCode,
    price_cents: price,
    is_active: true,
  });
  const rows = [row(value.fromCityId, value.toCityId)];
  if (value.withReturn && value.fromCityId !== value.toCityId) {
    rows.push(row(value.toCityId, value.fromCityId));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('price_grids')
    .upsert(rows, { onConflict: 'company_id,from_city_id,to_city_id,vehicle_type_code' });
  return error ? fromDbError(error) : done();
}

export async function setPriceGridActiveAction(id: string, active: boolean): Promise<FormResult> {
  if (!z.uuid().safeParse(id).success) return fail('forbidden');
  const context = await marketplaceContext();
  if ('error' in context) return context.error;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('price_grids')
    .update({ is_active: active === true })
    .eq('id', id)
    .eq('company_id', context.companyId)
    .select('id');
  if (error) return fromDbError(error);
  return data.length ? done() : fail('forbidden');
}
