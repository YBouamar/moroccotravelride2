import { expect, test } from '@playwright/test';
import { signInAsAdmin, sql } from './helpers';

// One serial journey: the admin TOTP factor is enrolled once per run (secret shown only once).
test.describe.configure({ mode: 'serial' });

test('a platform admin enrolls MFA, verifies a company and manages its subscription', async ({
  page,
}) => {
  // Dedicated company so the demo data is never modified by tests.
  const name = `E2E Admin ${Date.now()} SARL`;
  const companyId = sql(
    `insert into public.companies (legal_name) values ('${name}') returning id`,
  ).split('\n')[0]!;

  await signInAsAdmin(page);
  await expect(page.getByRole('heading', { name: "Vue d'ensemble" })).toBeVisible();
  await expect(page.getByRole('link', { name })).toBeVisible();

  // Company list filtered on pending companies.
  await page.getByRole('link', { name: 'Sociétés', exact: true }).click();
  await page.getByRole('link', { name: 'En attente' }).click();
  await expect(page).toHaveURL(/status=pending/);
  await page.getByRole('link', { name }).click();
  await expect(page).toHaveURL(new RegExp(`/fr/admin/companies/${companyId}$`));

  // Verification goes through an explicit confirmation dialog.
  await page.getByRole('button', { name: 'Vérifier la société' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('pourra apparaître sur la marketplace');
  await dialog.getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.getByText('Modifications enregistrées.')).toBeVisible();
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.getByText('Vérifiée', { exact: true }).first()).toBeVisible();

  // Specific commission rate, then subscription activation.
  await page.getByLabel('Taux spécifique (%)').fill('15');
  await page.getByRole('button', { name: 'Enregistrer' }).first().click();
  await expect(page.getByText('Modifications enregistrées.').first()).toBeVisible();
  expect(sql(`select commission_rate from public.companies where id = '${companyId}'`)).toBe(
    '0.1500',
  );

  await page.getByLabel('Offre').selectOption('standard');
  await page.getByLabel('Statut').selectOption('active');
  await page.getByRole('button', { name: 'Enregistrer' }).last().click();
  await expect(page.getByText('Modifications enregistrées.').last()).toBeVisible();
  expect(
    sql(
      `select plan_code || ':' || status from public.subscriptions where company_id = '${companyId}'`,
    ),
  ).toBe('standard:active');

  // Every change is in the audit trail, with the admin as actor.
  await page.reload();
  const history = page.locator('ol').last();
  await expect(history).toContainText('Société modifiée');
  await expect(history).toContainText('Abonnement modifié');
  await expect(history).toContainText('Admin Plateforme');

  // An invalid commission is refused.
  await page.getByLabel('Taux spécifique (%)').fill('150');
  await page.getByRole('button', { name: 'Enregistrer' }).first().click();
  await expect(page.getByText('Valeur invalide.')).toBeVisible();
});
