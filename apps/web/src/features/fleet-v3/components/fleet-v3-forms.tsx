import { casablancaDate, DEADLINE_KINDS, MAINTENANCE_KINDS } from '@mtr/shared';
import { getTranslations } from 'next-intl/server';
import { FormDataForm } from '@/components/forms/form-data-form';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { addDeadlineAction, addFuelLogAction, addMaintenanceAction } from '../actions';

type Vehicles = { id: string; registration: string }[];

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

async function VehicleSelect({ id, vehicles }: { id: string; vehicles: Vehicles }) {
  const t = await getTranslations('fleetV3');
  return (
    <Select id={id} name="vehicleId" required defaultValue="">
      <option value="">{t('chooseVehicle')}</option>
      {vehicles.map((vehicle) => (
        <option key={vehicle.id} value={vehicle.id}>
          {vehicle.registration}
        </option>
      ))}
    </Select>
  );
}

export async function DeadlineForm({ vehicles }: { vehicles: Vehicles }) {
  const t = await getTranslations();
  return (
    <FormDataForm action={addDeadlineAction} submitLabel={t('fleetV3.deadlines.add')}>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field id="deadline-vehicle" label={t('tripForm.vehicle')}>
          <VehicleSelect id="deadline-vehicle" vehicles={vehicles} />
        </Field>
        <Field id="deadline-kind" label={t('fleetV3.deadlines.kind')}>
          <Select id="deadline-kind" name="kind" defaultValue="insurance">
            {DEADLINE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`deadlineKind.${kind}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="deadline-label" label={t('fleetV3.deadlines.label')}>
          <Input id="deadline-label" name="label" maxLength={120} />
        </Field>
        <Field id="deadline-due" label={t('fleetV3.deadlines.dueOn')}>
          <Input id="deadline-due" name="dueOn" type="date" required />
        </Field>
      </div>
    </FormDataForm>
  );
}

export async function MaintenanceForm({ vehicles }: { vehicles: Vehicles }) {
  const t = await getTranslations();
  return (
    <FormDataForm action={addMaintenanceAction} submitLabel={t('fleetV3.maintenance.add')}>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field id="maintenance-vehicle" label={t('tripForm.vehicle')}>
          <VehicleSelect id="maintenance-vehicle" vehicles={vehicles} />
        </Field>
        <Field id="maintenance-kind" label={t('fleetV3.maintenance.kind')}>
          <Select id="maintenance-kind" name="kind" defaultValue="service">
            {MAINTENANCE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`maintenanceKind.${kind}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="maintenance-date" label={t('fleetV3.maintenance.date')}>
          <Input
            id="maintenance-date"
            name="performedOn"
            type="date"
            required
            defaultValue={casablancaDate()}
          />
        </Field>
        <Field id="maintenance-odometer" label={t('fleetV3.odometer')}>
          <Input id="maintenance-odometer" name="odometerKm" inputMode="numeric" dir="ltr" />
        </Field>
        <Field id="maintenance-garage" label={t('fleetV3.maintenance.garage')}>
          <Input id="maintenance-garage" name="garage" maxLength={120} />
        </Field>
        <Field id="maintenance-labour" label={t('fleetV3.maintenance.labour')}>
          <Input
            id="maintenance-labour"
            name="labour"
            inputMode="decimal"
            dir="ltr"
            defaultValue="0"
          />
        </Field>
        <Field id="maintenance-part" label={t('fleetV3.maintenance.part')}>
          <Input id="maintenance-part" name="partName" maxLength={120} />
        </Field>
        <Field id="maintenance-part-cost" label={t('fleetV3.maintenance.partCost')}>
          <Input id="maintenance-part-cost" name="partCost" inputMode="decimal" dir="ltr" />
        </Field>
      </div>
      <input type="hidden" name="partQuantity" value="1" />
      <Field id="maintenance-notes" label={t('fleetV3.maintenance.notes')}>
        <Input id="maintenance-notes" name="notes" maxLength={500} />
      </Field>
    </FormDataForm>
  );
}

export async function FuelForm({ vehicles }: { vehicles: Vehicles }) {
  const t = await getTranslations();
  return (
    <FormDataForm action={addFuelLogAction} submitLabel={t('fleetV3.fuel.add')}>
      <div className="grid gap-4 sm:grid-cols-5">
        <Field id="fuel-vehicle" label={t('tripForm.vehicle')}>
          <VehicleSelect id="fuel-vehicle" vehicles={vehicles} />
        </Field>
        <Field id="fuel-date" label={t('fleetV3.fuel.date')}>
          <Input
            id="fuel-date"
            name="filledOn"
            type="date"
            required
            defaultValue={casablancaDate()}
          />
        </Field>
        <Field id="fuel-odometer" label={t('fleetV3.odometer')}>
          <Input id="fuel-odometer" name="odometerKm" inputMode="numeric" dir="ltr" required />
        </Field>
        <Field id="fuel-volume" label={t('fleetV3.fuel.volume')}>
          <Input id="fuel-volume" name="volume" inputMode="decimal" dir="ltr" required />
        </Field>
        <Field id="fuel-amount" label={t('fleetV3.fuel.amount')}>
          <Input id="fuel-amount" name="amount" inputMode="decimal" dir="ltr" required />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="fullTank" defaultChecked className="size-4" />
        {t('fleetV3.fuel.fullTank')}
      </label>
    </FormDataForm>
  );
}
