import 'server-only';
import type { Locale } from 'next-intl';
import { createClient } from '@/lib/supabase/server';

/** Carrier side of the marketplace (step 12): visibility and price grid. RLS: members read. */
export async function getMarketplaceSettings(companyId: string, locale: Locale) {
  const supabase = await createClient();
  const [company, grids] = await Promise.all([
    supabase
      .from('companies')
      .select(
        'status, marketplace_enabled, marketplace_suspended_at, marketplace_suspension_reason, license_expires_on',
      )
      .eq('id', companyId)
      .single(),
    supabase
      .from('price_grids')
      .select(
        'id, vehicle_type_code, price_cents, is_active, from:cities!price_grids_from_city_id_fkey(name_fr, name_en, name_ar), to:cities!price_grids_to_city_id_fkey(name_fr, name_en, name_ar), vehicle_type:vehicle_types(name_fr, name_en, name_ar)',
      )
      .eq('company_id', companyId)
      .order('created_at'),
  ]);
  if (company.error) throw company.error;
  const name = (place: { name_fr: string; name_en: string; name_ar: string } | null) =>
    place ? place[`name_${locale}`] : '';
  return {
    company: company.data,
    grids: (grids.data ?? [])
      .map((grid) => ({
        id: grid.id,
        from: name(grid.from),
        to: name(grid.to),
        vehicleType: name(grid.vehicle_type),
        priceCents: grid.price_cents,
        isActive: grid.is_active,
      }))
      .sort((a, b) => a.from.localeCompare(b.from, locale) || a.to.localeCompare(b.to, locale)),
  };
}
