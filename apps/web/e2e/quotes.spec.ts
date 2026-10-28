import { expect, test } from '@playwright/test';
import { sql, waitForCaptcha } from './helpers';

const moroccoDay = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toLocaleDateString('en-CA', {
    timeZone: 'Africa/Casablanca',
  });

test('a traveler requests a tour quote without an account', async ({ page }) => {
  const email = `quote-${Date.now()}@example.com`;
  await page.goto('/fr');
  await page.getByRole('link', { name: /Composer mon voyage/ }).click();
  await expect(page).toHaveURL(/\/fr\/quote\?type=tour$/);
  await expect(page.getByLabel('Voyage organisé')).toBeChecked();

  await page.getByLabel('Nom complet').fill('Emma Martin');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Téléphone (avec indicatif)').fill('+33 6 00 00 00 01');
  await page.getByLabel('Ville de départ').selectOption({ label: 'Marrakech' });
  await page.getByLabel('Date de début').fill(moroccoDay(10));
  await page.getByLabel('Nombre de jours').fill('3');
  await page.getByLabel('Passagers').fill('4');
  await page.getByLabel('Votre projet').fill('Désert de Merzouga, retour par Ouarzazate.');
  await page.getByLabel(/J’accepte que mes coordonnées/).check();
  await waitForCaptcha(page);
  await page.getByRole('button', { name: 'Envoyer ma demande' }).click();
  await expect(page.getByText('Merci, votre demande est envoyée.', { exact: false })).toBeVisible();

  expect(
    sql(
      `select kind || ':' || days || ':' || status from public.quote_requests where email = '${email}'`,
    ),
  ).toBe('tour:3:new');
  expect(
    sql(
      `select count(*) from public.email_outbox where template = 'quote_request_received' and to_email = '${email}'`,
    ),
  ).toBe('1');
});
