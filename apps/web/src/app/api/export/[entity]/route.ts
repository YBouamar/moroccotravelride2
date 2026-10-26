import { can, toCsv, type CsvColumn, type Feature, type Permission } from '@mtr/shared';
import { NextResponse, type NextRequest } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { getCompanyContext } from '@/features/companies/context';
import { listClients, listDrivers, listVehicles } from '@/features/fleet/queries';
import { routing } from '@/i18n/routing';

const ENTITIES: Record<string, { feature: Feature; permission: Permission }> = {
  vehicles: { feature: 'vehicles', permission: 'vehicles.read' },
  drivers: { feature: 'drivers', permission: 'drivers.read' },
  clients: { feature: 'clients', permission: 'clients.read' },
};

/**
 * CSV export of a list with the same filters as the page (step 8). The company comes from the
 * session, never from the query string, and the user's RLS client runs the query.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  const { entity } = await params;
  const config = ENTITIES[entity];
  const context = await getCompanyContext();
  if (!config || !context) return new NextResponse(null, { status: 404 });
  if (!can(context.membership.role, config.permission) || !context.features.has(config.feature)) {
    return new NextResponse(null, { status: 403 });
  }

  const search = request.nextUrl.searchParams;
  const requested = search.get('locale') ?? '';
  const locale = (routing.locales as readonly string[]).includes(requested)
    ? (requested as (typeof routing.locales)[number])
    : routing.defaultLocale;
  const t = await getTranslations({ locale });
  const query = {
    q: search.get('q') ?? undefined,
    status: search.get('status') ?? undefined,
    sort: search.get('sort') ?? undefined,
    page: null,
  };
  const companyId = context.membership.companyId;

  let csv: string;
  if (entity === 'vehicles') {
    const { rows } = await listVehicles(companyId, query);
    const columns: CsvColumn<(typeof rows)[number]>[] = [
      { label: t('vehicleForm.registration'), value: (row) => row.registration },
      { label: t('vehicleForm.brand'), value: (row) => row.brand },
      { label: t('vehicleForm.model'), value: (row) => row.model },
      { label: t('vehicleForm.type'), value: (row) => row.vehicle_type_code },
      { label: t('vehicleForm.seats'), value: (row) => row.seats },
      { label: t('vehicleForm.luggage'), value: (row) => row.luggage_capacity },
      { label: t('vehicleForm.year'), value: (row) => row.year },
      { label: t('lists.status'), value: (row) => t(`vehicleStatus.${row.status}`) },
    ];
    csv = toCsv(columns, rows);
  } else if (entity === 'drivers') {
    const { rows } = await listDrivers(companyId, query);
    const columns: CsvColumn<(typeof rows)[number]>[] = [
      { label: t('driverForm.fullName'), value: (row) => row.full_name },
      { label: t('driverForm.phone'), value: (row) => row.phone },
      { label: t('driverForm.licenseNumber'), value: (row) => row.license_number },
      { label: t('driverForm.licenseExpiresOn'), value: (row) => row.license_expires_on },
      { label: t('driverForm.cardExpiresOn'), value: (row) => row.professional_card_expires_on },
      { label: t('driverForm.languages'), value: (row) => row.languages.join(' ') },
      { label: t('lists.status'), value: (row) => t(`driverStatus.${row.status}`) },
    ];
    csv = toCsv(columns, rows);
  } else {
    const { rows } = await listClients(companyId, query);
    const columns: CsvColumn<(typeof rows)[number]>[] = [
      { label: t('clientForm.name'), value: (row) => row.name },
      { label: t('clientForm.type'), value: (row) => t(`clientType.${row.type}`) },
      { label: t('clientForm.ice'), value: (row) => row.ice },
      { label: t('clientForm.email'), value: (row) => row.email },
      { label: t('clientForm.phone'), value: (row) => row.phone },
      { label: t('clientForm.address'), value: (row) => row.address },
      {
        label: t('lists.status'),
        value: (row) => t(`clientStatus.${row.is_active ? 'active' : 'inactive'}`),
      },
    ];
    csv = toCsv(columns, rows);
  }

  // The BOM lets Excel detect UTF-8 (accents, Arabic).
  return new NextResponse(`${String.fromCharCode(0xfeff)}${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${entity}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
