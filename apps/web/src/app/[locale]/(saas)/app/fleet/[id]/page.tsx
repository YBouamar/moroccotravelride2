import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { StatusAction } from '@/components/list/status-action';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { setVehicleStatusAction, updateVehicleAction } from '@/features/fleet/actions';
import { getListAccess } from '@/features/fleet/access';
import { VEHICLE_STATUSES } from '@/features/fleet/constants';
import { getVehicle } from '@/features/fleet/queries';
import { VehicleForm } from '@/features/onboarding/components/vehicle-form';
import { getVehicleTypeOptions } from '@/features/reference/queries';
import { FeatureGate } from '@/features/subscriptions/feature-gate';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

interface VehiclePageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function VehiclePage({ params }: VehiclePageProps) {
  const { locale: rawLocale, id } = await params;
  const locale = asLocale(rawLocale);
  setRequestLocale(locale);
  const [t, access, types] = await Promise.all([
    getTranslations(),
    getListAccess('vehicles.read', 'vehicles.manage'),
    getVehicleTypeOptions(locale),
  ]);
  if (!access) return <Alert>{t('lists.forbidden')}</Alert>;
  const vehicle = await getVehicle(access.companyId, id);
  if (!vehicle) notFound();

  return (
    <FeatureGate feature="vehicles">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Link href="/app/fleet" className="text-sm font-medium text-secondary underline">
          {t('lists.back')}
        </Link>
        <Card>
          <h1 className="mb-6 text-2xl font-bold">
            <span dir="ltr">{vehicle.registration}</span>
          </h1>
          {access.canManage ? (
            <VehicleForm
              types={types}
              action={updateVehicleAction.bind(null, vehicle.id)}
              nextHref="/app/fleet"
              submitLabel={t('lists.saveChanges')}
              initial={{
                registration: vehicle.registration,
                brand: vehicle.brand,
                model: vehicle.model,
                vehicleTypeCode: vehicle.vehicle_type_code,
                seats: vehicle.seats,
                luggageCapacity: vehicle.luggage_capacity,
                year: vehicle.year,
              }}
            />
          ) : (
            <p className="text-sm text-muted">
              {vehicle.brand} {vehicle.model} · {t(`vehicleStatus.${vehicle.status}`)}
            </p>
          )}
        </Card>
        {access.canManage ? (
          <Card>
            <h2 className="font-semibold">{t('lists.statusTitle')}</h2>
            <p className="mt-1 text-sm text-muted">
              {t('lists.currentStatus', { status: t(`vehicleStatus.${vehicle.status}`) })}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {VEHICLE_STATUSES.filter((status) => status !== vehicle.status).map((status) => (
                <StatusAction
                  key={status}
                  label={t(`fleet.setStatus.${status}`)}
                  description={t(`fleet.setStatusHelp.${status}`)}
                  action={setVehicleStatusAction.bind(null, vehicle.id, status)}
                />
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </FeatureGate>
  );
}
