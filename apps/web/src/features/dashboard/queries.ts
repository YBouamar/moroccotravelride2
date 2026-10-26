import 'server-only';
import {
  addDays,
  can,
  casablancaDate,
  casablancaStartOfDay,
  expiryAlert,
  type MemberRole,
} from '@mtr/shared';
import { getPlanningTrips } from '@/features/trips/queries';
import { createClient } from '@/lib/supabase/server';

/**
 * Dashboard of the day (step 11): what an office user needs this morning. Each block is loaded
 * only for the roles allowed to see it (RLS returns nothing to the others anyway).
 */
export async function getDashboard(companyId: string, role: MemberRole) {
  const supabase = await createClient();
  const today = casablancaDate();
  const dayStart = casablancaStartOfDay(today);
  const dayEnd = casablancaStartOfDay(addDays(today, 1));
  const weekEnd = casablancaStartOfDay(addDays(today, 8));

  const seeTrips = can(role, 'trips.read');
  const seeFinance = can(role, 'invoices.read');
  const seeDrivers = can(role, 'drivers.read');

  const [todayTrips, unassigned, invoices, drivers, vehicles, company] = await Promise.all([
    seeTrips ? getPlanningTrips(companyId, dayStart, dayEnd) : Promise.resolve([]),
    seeTrips
      ? supabase
          .from('trips')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'planned')
          .gte('starts_at', new Date().toISOString())
          .lt('starts_at', weekEnd.toISOString())
      : Promise.resolve({ count: 0 }),
    seeFinance
      ? supabase
          .from('invoices')
          .select('total_cents, paid_cents, due_date')
          .eq('company_id', companyId)
          .in('status', ['issued', 'partially_paid'])
          .limit(2000)
      : Promise.resolve({ data: [] }),
    seeDrivers
      ? supabase
          .from('drivers')
          .select('id, full_name, license_expires_on')
          .eq('company_id', companyId)
          .eq('status', 'active')
      : Promise.resolve({ data: [] }),
    supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'maintenance'),
    supabase.from('companies').select('license_expires_on').eq('id', companyId).single(),
  ]);

  const open = invoices.data ?? [];
  const unpaidCents = open.reduce(
    (sum, invoice) => sum + invoice.total_cents - invoice.paid_cents,
    0,
  );
  const overdue = open.filter((invoice) => invoice.due_date && invoice.due_date < today).length;

  const licenseAlerts = (drivers.data ?? [])
    .map((driver) => ({ ...driver, alert: expiryAlert(driver.license_expires_on, today) }))
    .filter((driver) => driver.alert !== null)
    .sort((a, b) => a.license_expires_on.localeCompare(b.license_expires_on));

  return {
    today,
    seeTrips,
    seeFinance,
    todayTrips,
    inProgress: todayTrips.filter((trip) => trip.status === 'in_progress').length,
    unassignedThisWeek: unassigned.count ?? 0,
    unpaidCents,
    openInvoices: open.length,
    overdue,
    licenseAlerts,
    vehiclesInMaintenance: vehicles.count ?? 0,
    companyLicenseAlert: expiryAlert(company.data?.license_expires_on, today, 60),
    companyLicenseExpiresOn: company.data?.license_expires_on ?? null,
  };
}
