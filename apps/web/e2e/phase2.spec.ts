import { expect, test } from '@playwright/test';
import { signIn, sql } from './helpers';

test.describe.configure({ mode: 'serial' });

function moroccoToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(new Date());
}

test('the dashboard shows the trips of the day and the alerts', async ({ page }) => {
  await signIn(page, 'owner.atlas@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/app$/);
  await expect(page.getByRole('heading', { name: 'Trajets du jour' })).toBeVisible();
  await expect(page.getByText('Emma Martin').first()).toBeVisible();
  await expect(page.getByText(/Hassan Ait Ali : permis expiré/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Trajets aujourd'hui/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Factures en retard/ })).toBeVisible();
});

test('Phase 2 acceptance: a trip goes from planning to a paid invoice', async ({ page }) => {
  test.setTimeout(150_000);
  const passenger = `Recette ${Date.now()}`;
  const today = moroccoToday();
  await signIn(page, 'manager.atlas@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/app$/);

  // 1. Plan and assign a trip late tonight (no conflict with the seeded trips).
  await page.goto(`/fr/app/trips/new?date=${today}`);
  await page.getByLabel('Client (facultatif)').selectOption({ label: 'Riad Atlas Palace' });
  await page.getByLabel('Nom du passager principal').fill(passenger);
  await page.getByLabel('Passagers', { exact: true }).fill('2');
  await page.getByLabel('Ville de départ').selectOption({ label: 'Marrakech' });
  await page.getByLabel('Adresse de prise en charge').fill('Riad Atlas Palace');
  await page.getByLabel("Ville d'arrivée").selectOption({ label: 'Aéroport Marrakech Menara' });
  await page.getByLabel('Adresse de dépose').fill('Terminal 1');
  await page.getByLabel('Départ', { exact: true }).fill(`${today}T22:00`);
  await page.getByLabel('Arrivée estimée').fill(`${today}T23:00`);
  await page.getByLabel('Prix convenu en MAD (facultatif)').fill('250');
  await page.getByLabel('Chauffeur', { exact: true }).selectOption({ label: 'Youssef Chauffeur' });
  await page.getByLabel('Véhicule').selectOption({ index: 3 });
  await page.getByRole('button', { name: 'Créer' }).click();
  await expect(page).toHaveURL(/\/fr\/app\/trips$/);
  const tripId = sql(`select id from public.trips where passenger_name = '${passenger}'`);
  expect(sql(`select status from public.trips where id = '${tripId}'`)).toBe('assigned');

  // 2. Run the trip.
  await page.goto(`/fr/app/trips/${tripId}`);
  await page.getByRole('button', { name: 'Démarrer le trajet' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.getByRole('button', { name: 'Terminer le trajet' })).toBeVisible();
  await page.getByRole('button', { name: 'Terminer le trajet' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
  await expect
    .poll(() => sql(`select status from public.trips where id = '${tripId}'`))
    .toBe('completed');

  // 3. Invoice it (VAT 0 % chosen on the line), issue and collect the payment.
  await page.goto('/fr/app/invoices');
  await page.getByLabel('Client', { exact: true }).selectOption({ label: 'Riad Atlas Palace' });
  await page.getByRole('button', { name: 'Créer le brouillon' }).click();
  await expect(page.getByRole('heading', { name: 'Facture en brouillon' })).toBeVisible();
  await page.getByLabel(new RegExp(passenger)).check();
  await page.getByLabel('TVA (%)').first().fill('0');
  await page.getByRole('button', { name: 'Ajouter 1 trajet' }).click();
  await expect(page.getByRole('cell', { name: new RegExp(passenger) })).toBeVisible();
  await page.getByRole('button', { name: 'Émettre la facture' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.getByRole('heading', { name: /Facture \d{4}-\d{6}/ })).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer le paiement' }).click();
  await expect(page.getByText('Payée', { exact: true })).toBeVisible();
  expect(
    sql(
      `select i.status, i.total_cents from public.invoices i join public.invoice_lines l on l.invoice_id = i.id where l.trip_id = '${tripId}'`,
    ),
  ).toBe('paid|25000');
});
