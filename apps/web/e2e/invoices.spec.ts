import { expect, test } from '@playwright/test';
import { signIn, sql } from './helpers';

test('an owner invoices a completed trip, issues, records a payment and credits the invoice', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page, 'owner.atlas@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/app$/);

  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Facturation' })
    .click();
  await expect(page.getByRole('heading', { name: 'Facturation' })).toBeVisible();

  // The carrier chooses its default VAT rate (none is imposed, ADR-007).
  await page.getByLabel('Taux de TVA par défaut (%)').fill('10');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect
    .poll(() =>
      sql(
        "select default_vat_rate from public.companies where id = '00000000-0000-4000-b000-000000000001'",
      ),
    )
    .toBe('0.1000');

  await page
    .getByLabel('Client', { exact: true })
    .selectOption({ label: 'Agence Découverte Maroc' });
  await page.getByRole('button', { name: 'Créer le brouillon' }).click();
  await expect(page.getByRole('heading', { name: 'Facture en brouillon' })).toBeVisible();

  // One completed trip (800 MAD) and one free line (2 x 50 MAD), VAT 10 %.
  await page.getByLabel(/Groupe Découverte \(aller\)/).check();
  await page.getByRole('button', { name: 'Ajouter 1 trajet' }).click();
  await expect(page.getByRole('cell', { name: /Groupe Découverte \(aller\)/ })).toBeVisible();
  await page.getByLabel('Désignation').fill("Temps d'attente");
  await page.getByLabel('Quantité').fill('2');
  await page.getByLabel('Prix unitaire HT (MAD)').fill('50');
  await page.getByRole('button', { name: 'Ajouter la ligne' }).click();
  await expect(page.getByRole('cell', { name: "Temps d'attente" })).toBeVisible();
  const invoiceId = page.url().split('/').pop()!;
  await expect
    .poll(() =>
      sql(
        `select subtotal_cents, vat_cents, total_cents from public.invoices where id = '${invoiceId}'`,
      ),
    )
    .toBe('90000|9000|99000');

  const preview = await page.request.get(`/api/invoices/${invoiceId}/pdf?locale=fr`);
  expect(preview.headers()['content-type']).toBe('application/pdf');

  // Issue: gapless number, then immutable.
  await page.getByRole('button', { name: 'Émettre la facture' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.getByRole('heading', { name: /Facture \d{4}-\d{6}/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ajouter la ligne' })).toHaveCount(0);

  // Partial payment.
  await page.getByLabel('Montant (MAD)').fill('500');
  await page.getByRole('button', { name: 'Enregistrer le paiement' }).click();
  await expect(page.getByText('Partiellement payée')).toBeVisible();
  await expect(page.getByText(/Reste à payer : 490/)).toBeVisible();

  const pdf = await page.request.get(`/api/invoices/${invoiceId}/pdf?locale=fr`);
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');

  // Full credit note.
  await page.getByRole('button', { name: 'Établir un avoir' }).click();
  await page.getByLabel("Motif de l'avoir").fill('Erreur de tarif');
  await page.getByRole('dialog').getByRole('button', { name: "Émettre l'avoir" }).click();
  await expect(
    page.getByText(/Annulée par l'avoir AV-\d{4}-\d{6} : Erreur de tarif/),
  ).toBeVisible();
});

test('a driver account cannot open invoices nor download a PDF', async ({ page }) => {
  await signIn(page, 'driver.atlas@moroccotravelride.test');
  await page.waitForURL(/\/app$/);
  await page.goto('/fr/app/invoices');
  await expect(page.getByText("Cette page n'est pas accessible avec votre rôle.")).toBeVisible();
  const response = await page.request.get('/api/invoices/00000000-0000-4000-9000-000000000999/pdf');
  expect(response.status()).toBe(403);
});
