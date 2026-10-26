import { expect, test } from '@playwright/test';
import { signIn, sql } from './helpers';

test.describe.configure({ mode: 'serial' });

/** Calendar day in Morocco, `offset` days from today. */
function moroccoDay(offset = 0): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(
    new Date(),
  );
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

test('a manager plans a trip, resolves a conflict by override, then cancels it', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const passenger = `Passager E2E ${Date.now()}`;
  const tomorrow = moroccoDay(1);
  await signIn(page, 'manager.atlas@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/app$/);

  await page.goto(`/fr/app/trips/new?date=${tomorrow}`);
  await page.getByLabel('Nom du passager principal').fill(passenger);
  await page.getByLabel('Passagers', { exact: true }).fill('2');
  await page.getByLabel('Ville de départ').selectOption({ label: 'Casablanca' });
  await page.getByLabel('Adresse de prise en charge').fill('Gare Casa Port');
  await page.getByLabel("Ville d'arrivée").selectOption({ label: 'Rabat' });
  await page.getByLabel('Adresse de dépose').fill('Hôtel Tour Hassan');
  await page.getByLabel('Départ', { exact: true }).fill(`${tomorrow}T09:00`);
  await page.getByLabel('Arrivée estimée').fill(`${tomorrow}T11:00`);
  await page.getByLabel('Prix convenu en MAD (facultatif)').fill('650');

  // Q24: the driver with an expired license cannot be chosen.
  const driver = page.getByLabel('Chauffeur', { exact: true });
  await expect(driver.locator('option', { hasText: 'Hassan Ait Ali' })).toBeDisabled();
  // Youssef already drives the Découverte group tomorrow from 08:00 to 12:00 (seed).
  await driver.selectOption({ label: 'Youssef Chauffeur' });
  await page.getByLabel('Véhicule').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByText('Conflit de planning')).toBeVisible();

  // BR-114: an owner or manager can override with a reason.
  await page.getByLabel(/Je confirme ce trajet malgré le conflit/).check();
  await page.getByLabel('Motif de la dérogation').fill('Deux chauffeurs en relais');
  await page.getByRole('button', { name: 'Créer' }).click();
  await expect(page).toHaveURL(/\/fr\/app\/trips$/);
  await expect
    .poll(() =>
      sql(
        `select conflict_override, price_cents from public.trips where passenger_name = '${passenger}'`,
      ),
    )
    .toBe('t|65000');

  // The planning shows the trip on its day.
  await page.goto(`/fr/app/planning?view=day&date=${tomorrow}`);
  await expect(page.getByRole('heading', { name: 'Youssef Chauffeur' })).toBeVisible();
  await page.getByRole('link', { name: new RegExp(passenger) }).click();
  await expect(
    page.getByText('Conflit accepté par dérogation : Deux chauffeurs en relais'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Annuler le trajet' }).click();
  await page.getByLabel("Motif d'annulation").fill('Client a changé de date');
  await page.getByRole('dialog').getByRole('button', { name: 'Annuler le trajet' }).click();
  await expect(page.getByText('Annulé : Client a changé de date')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Modifier le trajet' })).toHaveCount(0);
});

test('the week planning lists the trips and the trips list filters by status', async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, 'owner.atlas@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/app$/);

  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Planning' })
    .click();
  await expect(page.getByRole('heading', { name: 'Planning' })).toBeVisible();
  await expect(page.getByText('Emma Martin').first()).toBeVisible();

  await page.goto('/fr/app/trips?status=planned');
  await expect(page.getByRole('table').getByText('Famille Haddad')).toBeVisible();
  await expect(page.getByRole('table').getByText('Emma Martin')).toHaveCount(0);
});
