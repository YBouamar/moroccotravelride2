import { expect, test } from '@playwright/test';
import { signIn, sql } from './helpers';

test('V3: deadlines, maintenance with a part and fuel consumption', async ({ page }) => {
  test.setTimeout(90_000);
  const garage = `Garage E2E ${Date.now()}`;
  await signIn(page, 'owner.atlas@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/app$/);
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Parc' })
    .click();
  await expect(page.getByRole('heading', { name: 'Parc' })).toBeVisible();

  // Seeded insurance deadline in 20 days.
  await expect(
    page
      .getByRole('row', { name: /Assurance · Wafa Assurance/ })
      .getByText('Dans moins de 30 jours'),
  ).toBeVisible();
  await page.getByLabel('Véhicule').selectOption({ label: '34567-A-6' });
  await page.getByLabel('Type', { exact: true }).selectOption('technical_inspection');
  await page.getByLabel('Échéance', { exact: true }).fill('2030-06-30');
  await page.getByRole('button', { name: "Enregistrer l'échéance" }).click();
  await expect(
    page.getByRole('row', { name: /Visite technique/ }).getByText('À jour'),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Entretien' }).click();
  await expect(page.getByRole('heading', { name: 'Nouvel entretien' })).toBeVisible();
  await page.getByLabel('Véhicule').selectOption({ label: '34567-A-6' });
  await page.getByLabel('Garage (facultatif)').fill(garage);
  await page.getByLabel("Main-d'œuvre (MAD)").fill('300');
  await page.getByLabel('Pièce (facultatif)').fill('Filtre à huile');
  await page.getByLabel('Prix de la pièce (MAD)').fill('80');
  await page.getByRole('button', { name: "Enregistrer l'entretien" }).click();
  await expect(page.getByRole('cell', { name: 'Filtre à huile' })).toBeVisible();
  expect(
    sql(`select labour_cents from public.maintenance_records where garage = '${garage}'`),
  ).toBe('30000');

  // Seeded fills: 64 L over 800 km = 8 L / 100 km.
  await page.getByRole('link', { name: 'Consommation' }).click();
  await expect(page.getByRole('heading', { name: 'Nouveau plein' })).toBeVisible();
  await expect(page.getByText('8 L / 100 km')).toBeVisible();
});
