import 'server-only';
import { consumptionPer100Km, maintenanceTotal } from '@mtr/shared';
import { createClient } from '@/lib/supabase/server';

/** V3 fleet data (Phase 5). RLS: office roles read. */

export async function getDeadlines(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('vehicle_deadlines')
    .select('id, kind, label, due_on, done_at, last_reminder_days, vehicle:vehicles(registration)')
    .eq('company_id', companyId)
    .order('done_at', { ascending: true, nullsFirst: true })
    .order('due_on')
    .limit(200);
  return data ?? [];
}

export async function getMaintenance(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('maintenance_records')
    .select(
      'id, kind, performed_on, odometer_km, garage, labour_cents, vehicle:vehicles(registration), parts:maintenance_parts(name, quantity, unit_cost_cents)',
    )
    .eq('company_id', companyId)
    .order('performed_on', { ascending: false })
    .limit(200);
  return (data ?? []).map((record) => ({
    ...record,
    totalCents: maintenanceTotal(
      record.labour_cents,
      record.parts.map((part) => ({
        quantity: part.quantity,
        unitCostCents: part.unit_cost_cents,
      })),
    ),
  }));
}

/** Fuel fills and the average consumption per vehicle (between full tanks). */
export async function getFuel(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('fuel_logs')
    .select(
      'id, vehicle_id, filled_on, odometer_km, volume_cl, amount_cents, full_tank, vehicle:vehicles(registration)',
    )
    .eq('company_id', companyId)
    .order('filled_on', { ascending: false })
    .limit(500);
  const logs = data ?? [];
  const byVehicle = new Map<string, { registration: string; fills: typeof logs }>();
  for (const log of logs) {
    const entry = byVehicle.get(log.vehicle_id) ?? {
      registration: log.vehicle?.registration ?? '',
      fills: [],
    };
    entry.fills.push(log);
    byVehicle.set(log.vehicle_id, entry);
  }
  const consumption = [...byVehicle.entries()].map(([vehicleId, entry]) => ({
    vehicleId,
    registration: entry.registration,
    per100KmCl: consumptionPer100Km(
      entry.fills.map((fill) => ({
        odometerKm: fill.odometer_km,
        volumeCl: fill.volume_cl,
        fullTank: fill.full_tank,
      })),
    ),
    spentCents: entry.fills.reduce((sum, fill) => sum + fill.amount_cents, 0),
  }));
  return { logs, consumption };
}
