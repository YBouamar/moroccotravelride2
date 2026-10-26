import { expect, test } from '@playwright/test';
import { signIn, sql } from './helpers';

test.describe.configure({ mode: 'serial' });

test('a manager searches the fleet, edits a vehicle and exports the list', async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, 'manager.atlas@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/app$/);

  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Flotte' })
    .click();
  await expect(page).toHaveURL(/\/fr\/app\/fleet$/);
  await expect(page.getByRole('heading', { name: 'Flotte' })).toBeVisible();

  // Server-side search: the query lives in the URL.
  await page.getByLabel('Rechercher').fill('vito');
  await page.getByRole('button', { name: 'Appliquer' }).click();
  await expect(page).toHaveURL(/q=vito/);
  const table = page.getByRole('table');
  await expect(table.getByRole('link', { name: '23456-B-6' })).toBeVisible();
  await expect(table.getByRole('link', { name: '12345-A-6' })).toHaveCount(0);

  // CSV export with the same filter, protected and UTF-8 with BOM.
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Exporter en CSV' }).click();
  const file = await download;
  const content = await (await file.createReadStream()).toArray();
  const text = Buffer.concat(content).toString('utf8');
  expect(text.charCodeAt(0)).toBe(0xfeff);
  expect(text).toContain('"23456-B-6"');
  expect(text).not.toContain('12345-A-6');

  // Edit then set to maintenance (no physical delete).
  await table.getByRole('link', { name: '23456-B-6' }).click();
  await page.getByLabel('Places passagers').fill('8');
  await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();
  await expect(page).toHaveURL(/\/fr\/app\/fleet$/);
  await expect
    .poll(() => sql("select seats from public.vehicles where registration = '23456-B-6'"))
    .toBe('8');

  await page.getByRole('table').getByRole('link', { name: '23456-B-6' }).click();
  await page.getByRole('button', { name: 'Passer en maintenance' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.getByText('Statut actuel : En maintenance.')).toBeVisible();

  // Restore the seed state for the other tests.
  sql("update public.vehicles set seats = 7, status = 'active' where registration = '23456-B-6'");
});

test('a manager adds a B2B client, the ICE is checked', async ({ page }) => {
  test.setTimeout(60_000);
  const name = `Agence E2E ${Date.now()}`;
  await signIn(page, 'manager.atlas@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/app$/);
  await page.goto('/fr/app/clients/new');

  await page.getByLabel('Nom ou raison sociale').fill(name);
  await page.getByLabel('ICE (facultatif)').fill('123');
  await page.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByText("L'ICE comporte 15 chiffres.")).toBeVisible();
  await page.getByLabel('ICE (facultatif)').fill('000000000000999');
  await page.getByRole('button', { name: 'Créer' }).click();
  await expect(page).toHaveURL(/\/fr\/app\/clients$/);

  await page.getByLabel('Rechercher').fill(name);
  await page.getByRole('button', { name: 'Appliquer' }).click();
  await expect(page.getByRole('table').getByRole('link', { name })).toBeVisible();

  // A traveler (B2C) has no ICE field.
  await page.goto('/fr/app/clients/new');
  await page.getByLabel('Type de client').selectOption('b2c');
  await expect(page.getByLabel('ICE (facultatif)')).toHaveCount(0);
});

test('drivers see the expired license and a driver account cannot open the client list', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await signIn(page, 'owner.atlas@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/app$/);
  await page.goto('/fr/app/drivers');
  const row = page.getByRole('row', { name: /Hassan Ait Ali/ });
  await expect(row.getByText('Permis expiré')).toBeVisible();

  await page.context().clearCookies();
  await signIn(page, 'driver.atlas@moroccotravelride.test');
  await page.waitForURL(/\/fr\/app$/);
  await page.goto('/fr/app/clients');
  await expect(page.getByText("Cette page n'est pas accessible avec votre rôle.")).toBeVisible();
  const response = await page.request.get('/api/export/clients');
  expect(response.status()).toBe(403);
});
