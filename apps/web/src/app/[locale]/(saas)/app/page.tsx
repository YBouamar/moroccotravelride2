import { formatMoney } from '@mtr/shared';
import {
  AlertTriangle,
  CalendarClock,
  CarFront,
  FileWarning,
  LayoutDashboard,
  ListChecks,
  Route,
  Wallet,
} from 'lucide-react';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { getCompanyContext } from '@/features/companies/context';
import { StatTile } from '@/features/dashboard/components/stat-tile';
import { getDashboard } from '@/features/dashboard/queries';
import { getOfficeContext } from '@/features/onboarding/office';
import { getOnboardingData } from '@/features/onboarding/queries';
import { TripCard } from '@/features/trips/components/trip-card';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, format, context, office] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getCompanyContext(),
    getOfficeContext(),
  ]);
  if (!context) return null;
  // Owners and managers see the setup progress until the onboarding is complete.
  const progress = office ? (await getOnboardingData(office.membership.companyId)).progress : null;
  const data = await getDashboard(context.membership.companyId, context.membership.role);
  const day = (value: string) =>
    format.dateTime(new Date(`${value}T12:00:00Z`), { dateStyle: 'medium', timeZone: 'UTC' });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t('saas.dashboard.title')}</h1>
        <p className="text-sm text-muted">
          {format.dateTime(new Date(`${data.today}T12:00:00Z`), {
            dateStyle: 'full',
            timeZone: 'UTC',
          })}
        </p>
      </div>

      {progress && !progress.completed ? (
        <Card className="flex flex-wrap items-center gap-4">
          <ListChecks aria-hidden="true" className="size-8 shrink-0 text-secondary" />
          <div className="min-w-0 flex-1">
            <CardTitle>{t('onboarding.dashboardTitle')}</CardTitle>
            <CardDescription>
              {t('onboarding.progress', { done: progress.doneCount, total: progress.steps.length })}
            </CardDescription>
          </div>
          <Link href="/app/onboarding" className={buttonVariants()}>
            {t('onboarding.dashboardAction')}
          </Link>
        </Card>
      ) : null}

      {data.companyLicenseAlert && data.companyLicenseExpiresOn ? (
        <Alert tone="danger">
          {t(`saas.dashboard.companyLicense.${data.companyLicenseAlert}`, {
            date: day(data.companyLicenseExpiresOn),
          })}
        </Alert>
      ) : null}

      {data.seeTrips || data.seeFinance ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.seeTrips ? (
            <>
              <StatTile
                icon={Route}
                label={t('saas.dashboard.stats.today')}
                value={String(data.todayTrips.length)}
                href={`/app/planning?view=day&date=${data.today}`}
              />
              <StatTile
                icon={CalendarClock}
                label={t('saas.dashboard.stats.unassigned')}
                value={String(data.unassignedThisWeek)}
                href="/app/trips?status=planned"
                attention={data.unassignedThisWeek > 0}
              />
            </>
          ) : null}
          {data.seeFinance ? (
            <>
              <StatTile
                icon={Wallet}
                label={t('saas.dashboard.stats.unpaid', { count: data.openInvoices })}
                value={formatMoney(data.unpaidCents, locale)}
                href="/app/invoices?status=issued"
              />
              <StatTile
                icon={FileWarning}
                label={t('saas.dashboard.stats.overdue')}
                value={String(data.overdue)}
                href="/app/invoices"
                attention={data.overdue > 0}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {data.licenseAlerts.length > 0 || data.vehiclesInMaintenance > 0 ? (
        <Card className="flex flex-col gap-3">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle aria-hidden="true" className="size-5 text-danger" />
            {t('saas.dashboard.alerts.title')}
          </CardTitle>
          <ul className="flex flex-col gap-2 text-sm">
            {data.licenseAlerts.map((driver) => (
              <li key={driver.id}>
                <Link href={`/app/drivers/${driver.id}`} className="underline">
                  {t(`saas.dashboard.alerts.license.${driver.alert!}`, {
                    name: driver.full_name,
                    date: day(driver.license_expires_on),
                  })}
                </Link>
              </li>
            ))}
            {data.vehiclesInMaintenance > 0 ? (
              <li className="flex items-center gap-2">
                <CarFront aria-hidden="true" className="size-4 text-muted" />
                <Link href="/app/fleet?status=maintenance" className="underline">
                  {t('saas.dashboard.alerts.maintenance', { count: data.vehiclesInMaintenance })}
                </Link>
              </li>
            ) : null}
          </ul>
        </Card>
      ) : null}

      {data.seeTrips ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t('saas.dashboard.todayTrips')}</h2>
          {data.todayTrips.length === 0 ? (
            <Card className="text-sm text-muted">{t('saas.dashboard.noTripToday')}</Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.todayTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <EmptyState
          icon={LayoutDashboard}
          title={t('saas.dashboard.empty.title')}
          description={t('saas.dashboard.driverHint')}
        />
      )}
    </div>
  );
}
