import { expect, test } from '@playwright/test';
import { signIn, sql } from './helpers';

test('the owner files an expense with a receipt, then approves and rejects expenses', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const note = `Plein E2E ${Date.now()}`;
  await signIn(page, 'owner.atlas@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/app$/);
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Dépenses' })
    .click();
  await expect(page.getByRole('heading', { name: 'Dépenses' })).toBeVisible();

  await page.getByLabel('Montant (MAD)').fill('450');
  await page.getByLabel('Véhicule').selectOption({ label: '12345-A-6' });
  await page.getByLabel('Description (facultatif)').fill(note);
  await page.getByLabel(/Justificatif/).setInputFiles({
    name: 'ticket.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n% receipt\n'),
  });
  await page.getByRole('button', { name: 'Enregistrer la dépense' }).click();
  await expect
    .poll(() =>
      sql(
        `select amount_cents, status, receipt_path is not null from public.expenses where description = '${note}'`,
      ),
    )
    .toBe('45000|submitted|t');

  const row = page
    .getByRole('row', { name: /Carburant/ })
    .filter({ hasText: '12345-A-6' })
    .first();
  await row.getByRole('button', { name: 'Valider' }).click();
  await expect
    .poll(() => sql(`select status from public.expenses where description = '${note}'`))
    .toBe('approved');

  // A second one, rejected with a reason.
  await page.getByLabel('Montant (MAD)').fill('30');
  await page.getByLabel('Catégorie').selectOption('meal');
  await page.getByLabel('Description (facultatif)').fill(`${note} repas`);
  await page.getByRole('button', { name: 'Enregistrer la dépense' }).click();
  await expect
    .poll(() => sql(`select count(*) from public.expenses where description = '${note} repas'`))
    .toBe('1');
  await page
    .getByRole('row', { name: /Repas/ })
    .first()
    .getByRole('button', { name: 'Refuser' })
    .click();
  await page.getByLabel('Motif du refus').fill('Hors mission');
  await page.getByRole('dialog').getByRole('button', { name: 'Refuser' }).click();
  await expect
    .poll(() =>
      sql(
        `select status, rejection_reason from public.expenses where description = '${note} repas'`,
      ),
    )
    .toBe('rejected|Hors mission');
});
