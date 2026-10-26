import { can, casablancaDate, deadlineState, formatMoney, type Feature } from '@mtr/shared';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { DataTable, type Column } from '@/components/list/data-table';
import { StatusAction } from '@/components/list/status-action';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { getCompanyContext } from '@/features/companies/context';
import { completeDeadlineAction } from '@/features/fleet-v3/actions';
import {
  DeadlineForm,
  FuelForm,
  MaintenanceForm,
} from '@/features/fleet-v3/components/fleet-v3-forms';
import { getDeadlines, getFuel, getMaintenance } from '@/features/fleet-v3/queries';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { getAssignmentOptions } from '@/features/trips/queries';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export async function generateMetadata() {
  const t = await getTranslations('fleetV3');
  return { title: t('title') };
}

const TABS = [
  { key: 'deadlines', feature: 'vehicle_deadlines' },
  { key: 'maintenance', feature: 'fleet_maintenance' },
  { key: 'fuel', feature: 'fuel_tracking' },
] as const satisfies readonly { key: string; feature: Feature }[];

/** V3 fleet management (Phase 5): deadlines with reminders, maintenance, fuel consumption. */
export default async function FleetV3Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const requested = (await searchParams).tab;
  const tab = TABS.find((candidate) => candidate.key === requested) ?? TABS[0];
  const [t, format, context] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getCompanyContext(),
  ]);
  if (!context || !can(context.membership.role, 'fleet.read'))
    return <Alert>{t('lists.forbidden')}</Alert>;
  const companyId = context.membership.companyId;
  const role = context.membership.role;
  const writable = context.canWrite && context.features.has(tab.feature);
  const { vehicles } = await getAssignmentOptions(companyId);
  const today = casablancaDate();
  const day = (value: string) =>
    format.dateTime(new Date(`${value}T12:00:00Z`), { dateStyle: 'medium', timeZone: 'UTC' });

  let content: React.ReactNode = null;
  if (tab.key === 'deadlines') {
    const deadlines = await getDeadlines(companyId);
    const columns: Column<(typeof deadlines)[number]>[] = [
      {
        key: 'vehicle',
        header: t('tripForm.vehicle'),
        cell: (row) => <span dir="ltr">{row.vehicle?.registration}</span>,
      },
      {
        key: 'kind',
        header: t('fleetV3.deadlines.kind'),
        cell: (row) => [t(`deadlineKind.${row.kind}`), row.label].filter(Boolean).join(' · '),
      },
      { key: 'due', header: t('fleetV3.deadlines.dueOn'), cell: (row) => day(row.due_on) },
      {
        key: 'state',
        header: t('lists.status'),
        cell: (row) => {
          const state = deadlineState(row.due_on, today, !!row.done_at);
          return (
            <Badge variant={state === 'ok' || state === 'done' ? 'verified' : 'neutral'}>
              {t(`fleetV3.deadlines.state.${state}`)}
            </Badge>
          );
        },
      },
      {
        key: 'action',
        header: t('expenses.actions'),
        cell: (row) =>
          !row.done_at && writable && can(role, 'fleet.manage') ? (
            <StatusAction
              label={t('fleetV3.deadlines.done')}
              description={t('fleetV3.deadlines.doneHelp')}
              action={completeDeadlineAction.bind(null, row.id)}
            />
          ) : null,
      },
    ];
    content = (
      <>
        {writable && can(role, 'fleet.manage') ? (
          <Card className="flex flex-col gap-4">
            <CardTitle>{t('fleetV3.deadlines.new')}</CardTitle>
            <p className="text-sm text-muted">{t('fleetV3.deadlines.help')}</p>
            <DeadlineForm vehicles={vehicles} />
          </Card>
        ) : null}
        <DataTable
          columns={columns}
          rows={deadlines}
          empty={t('lists.empty')}
          caption={t('fleetV3.tabs.deadlines')}
        />
      </>
    );
  } else if (tab.key === 'maintenance') {
    const records = await getMaintenance(companyId);
    const columns: Column<(typeof records)[number]>[] = [
      { key: 'date', header: t('fleetV3.maintenance.date'), cell: (row) => day(row.performed_on) },
      {
        key: 'vehicle',
        header: t('tripForm.vehicle'),
        cell: (row) => <span dir="ltr">{row.vehicle?.registration}</span>,
      },
      {
        key: 'kind',
        header: t('fleetV3.maintenance.kind'),
        cell: (row) => t(`maintenanceKind.${row.kind}`),
      },
      {
        key: 'odometer',
        header: t('fleetV3.odometer'),
        cell: (row) => (row.odometer_km === null ? '' : format.number(row.odometer_km)),
      },
      {
        key: 'parts',
        header: t('fleetV3.maintenance.part'),
        cell: (row) => row.parts.map((part) => part.name).join(', '),
      },
      {
        key: 'total',
        header: t('fleetV3.maintenance.total'),
        cell: (row) => formatMoney(row.totalCents, locale),
      },
    ];
    content = (
      <>
        {writable && can(role, 'fleet.manage') ? (
          <Card className="flex flex-col gap-4">
            <CardTitle>{t('fleetV3.maintenance.new')}</CardTitle>
            <MaintenanceForm vehicles={vehicles} />
          </Card>
        ) : null}
        <DataTable
          columns={columns}
          rows={records}
          empty={t('lists.empty')}
          caption={t('fleetV3.tabs.maintenance')}
        />
      </>
    );
  } else {
    const { logs, consumption } = await getFuel(companyId);
    const columns: Column<(typeof logs)[number]>[] = [
      { key: 'date', header: t('fleetV3.fuel.date'), cell: (row) => day(row.filled_on) },
      {
        key: 'vehicle',
        header: t('tripForm.vehicle'),
        cell: (row) => <span dir="ltr">{row.vehicle?.registration}</span>,
      },
      {
        key: 'odometer',
        header: t('fleetV3.odometer'),
        cell: (row) => format.number(row.odometer_km),
      },
      {
        key: 'volume',
        header: t('fleetV3.fuel.volume'),
        cell: (row) => format.number(row.volume_cl / 100, { maximumFractionDigits: 2 }),
      },
      {
        key: 'amount',
        header: t('fleetV3.fuel.amount'),
        cell: (row) => formatMoney(row.amount_cents, locale),
      },
    ];
    content = (
      <>
        {writable && can(role, 'fuel.manage') ? (
          <Card className="flex flex-col gap-4">
            <CardTitle>{t('fleetV3.fuel.new')}</CardTitle>
            <FuelForm vehicles={vehicles} />
          </Card>
        ) : null}
        {consumption.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-3">
            {consumption.map((vehicle) => (
              <li key={vehicle.vehicleId}>
                <Card className="flex flex-col gap-1">
                  <p className="font-semibold" dir="ltr">
                    {vehicle.registration}
                  </p>
                  <p className="text-2xl font-bold">
                    {vehicle.per100KmCl === null
                      ? t('fleetV3.fuel.notEnough')
                      : t('fleetV3.fuel.per100', {
                          litres: format.number(vehicle.per100KmCl / 100, {
                            maximumFractionDigits: 1,
                          }),
                        })}
                  </p>
                  <p className="text-sm text-muted">
                    {t('fleetV3.fuel.spent', { amount: formatMoney(vehicle.spentCents, locale) })}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        ) : null}
        <DataTable
          columns={columns}
          rows={logs}
          empty={t('lists.empty')}
          caption={t('fleetV3.tabs.fuel')}
        />
      </>
    );
  }

  return (
    <FeatureGate feature={tab.feature}>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">{t('fleetV3.title')}</h1>
        <nav aria-label={t('fleetV3.title')} className="flex flex-wrap gap-2">
          {TABS.map((candidate) => (
            <Link
              key={candidate.key}
              href={`/app/maintenance?tab=${candidate.key}`}
              aria-current={candidate.key === tab.key ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-11 items-center rounded-control border border-border px-4 text-sm',
                candidate.key === tab.key
                  ? 'bg-secondary font-semibold text-secondary-foreground'
                  : 'bg-surface',
              )}
            >
              {t(`fleetV3.tabs.${candidate.key}`)}
            </Link>
          ))}
        </nav>
        {content}
      </div>
    </FeatureGate>
  );
}
