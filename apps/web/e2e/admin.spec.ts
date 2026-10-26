import { expect, test } from '@playwright/test';
import { signIn, signInAsAdmin, sql } from './helpers';

// One serial journey: the admin TOTP factor is enrolled once per run (secret shown only once).
test.describe.configure({ mode: 'serial' });

test('a platform admin enrolls MFA, verifies a company and manages its subscription', async ({
  page,
}) => {
  test.setTimeout(90_000); // long journey: MFA, verification, commission, subscription, history
  // Dedicated company so the demo data is never modified by tests.
  const name = `E2E Admin ${Date.now()} SARL`;
  const companyId = sql(
    `insert into public.companies (legal_name) values ('${name}') returning id`,
  ).split('\n')[0]!;

  await signInAsAdmin(page);
  await expect(page.getByRole('heading', { name: "Vue d'ensemble" })).toBeVisible();
  // (The overview lists the 5 oldest pending companies; test runs leave many behind.)

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
  // Several forms show the same "saved" message: wait for the database value itself.
  await expect
    .poll(() => sql(`select commission_rate from public.companies where id = '${companyId}'`))
    .toBe('0.1500');

  await page.getByLabel('Offre').selectOption('standard');
  await page.getByLabel('Statut').selectOption('active');
  await page.getByRole('button', { name: 'Enregistrer' }).last().click();
  await expect
    .poll(() =>
      sql(
        `select plan_code || ':' || status from public.subscriptions where company_id = '${companyId}'`,
      ),
    )
    .toBe('standard:active');

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

test('the admin fills in the payment details shown to carriers (Q23)', async ({ browser }) => {
  test.setTimeout(90_000); // may wait for the next TOTP window
  const admin = await browser.newPage();
  try {
    await signInAsAdmin(admin);
    await admin.getByRole('link', { name: 'Paramètres' }).click();
    await expect(admin.getByRole('heading', { name: 'Paramètres', level: 1 })).toBeVisible();

    await admin.getByLabel('RIB (24 chiffres)').fill('12345');
    await admin.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(admin.getByText('Le RIB doit comporter 24 chiffres.')).toBeVisible();

    await admin.getByLabel('Banque').fill('Banque Test E2E');
    await admin.getByLabel('Titulaire du compte').fill('MoroccoTravelRide SARL');
    await admin.getByLabel('RIB (24 chiffres)').fill('0117 8000 0012 3456 7890 1234');
    await admin.getByLabel('E-mail de contact').fill('facturation@moroccotravelride.test');
    await admin.getByLabel('Téléphone de contact').fill('+212 5 22 00 00 00');
    await admin.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(admin.getByText('Modifications enregistrées.')).toBeVisible();

    const carrier = await browser.newPage();
    await signIn(carrier, 'owner.sahara@moroccotravelride.test');
    await expect(carrier).toHaveURL(/\/fr\/app$/);
    await carrier.goto('/fr/app/subscription');
    await expect(carrier.getByText('Coordonnées de paiement')).toBeVisible();
    await expect(carrier.getByText('0117 8000 0012 3456 7890 1234')).toBeVisible();
    await expect(
      carrier.getByRole('link', { name: 'facturation@moroccotravelride.test' }),
    ).toHaveAttribute('href', 'mailto:facturation@moroccotravelride.test');
    await carrier.close();
  } finally {
    sql(
      `update public.platform_settings set value = '{"bank_name": "", "account_holder": "", "rib": "", "email": "", "phone": ""}' where key = 'subscription_payment_info'`,
    );
    await admin.close();
  }
});

test('the admin approves and rejects company documents', async ({ page }) => {
  test.setTimeout(90_000); // may wait for the next TOTP window
  const name = `E2E Documents ${Date.now()} SARL`;
  const companyId = sql(
    `insert into public.companies (legal_name) values ('${name}') returning id`,
  ).split('\n')[0]!;
  // Fixtures: two pending documents (database rows; the files are not needed to review them).
  for (const type of ['tourism_license', 'insurance']) {
    sql(
      `insert into public.company_documents (company_id, type, storage_path) values ('${companyId}', '${type}', '${companyId}/${type}.pdf')`,
    );
  }

  await signInAsAdmin(page);
  await page.goto(`/fr/admin/companies/${companyId}`);

  await page.getByRole('button', { name: 'Approuver' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.getByText('Modifications enregistrées.')).toBeVisible();

  await page.getByLabel('Motif du refus').last().fill('Attestation illisible');
  await page.getByRole('button', { name: 'Refuser' }).last().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.getByText('Modifications enregistrées.').last()).toBeVisible();

  // Poll the database: the first "saved" message may already be on screen before the refusal ends.
  await expect
    .poll(() =>
      sql(
        `select string_agg(type || ':' || verification_status || ':' || coalesce(rejection_reason, ''), ',' order by type) from public.company_documents where company_id = '${companyId}'`,
      ),
    )
    // Newest first in the list: the insurance (approved) comes before the license (rejected).
    .toBe('tourism_license:rejected:Attestation illisible,insurance:approved:');
});

test('the admin generates a monthly commission statement and records its payment (ADR-016)', async ({
  page,
}) => {
  test.setTimeout(120_000);
  // A completed Atlas booking of the previous month: 800 MAD, 160 MAD of commission.
  const ref = `MTR-${['A', 'B', 'C', 'D', 'E', 'F'].sort(() => Math.random() - 0.5).join('')}`;
  sql(`
    with b as (
      insert into public.bookings (public_ref, company_id, traveler_name, traveler_email, traveler_phone,
        passengers, from_city_id, to_city_id, pickup_address, dropoff_address, pickup_at, vehicle_type_code,
        total_cents, commission_rate_bps, commission_cents, carrier_cents, cancellation_policy, payment_method,
        status, accept_deadline)
      select '${ref}', '00000000-0000-4000-b000-000000000001', 'Traveler', 't@example.test', '+33600000001', 1,
        c.id, c.id, 'A street', 'B street', date_trunc('month', now()) - interval '10 days', 'sedan',
        80000, 2000, 16000, 64000, '{"tiers": []}', 'cash_to_driver', 'completed', now()
      from public.cities c where c.slug = 'casablanca'
      returning id
    )
    insert into public.commission_ledger (company_id, booking_id, kind, amount_cents, occurred_at)
    select '00000000-0000-4000-b000-000000000001', id, 'completed', 16000, date_trunc('month', now()) - interval '10 days' from b`);

  await signInAsAdmin(page);
  await page.goto('/fr/admin/commissions');
  await page.getByRole('button', { name: 'Générer' }).click();
  const card = page.locator('li', { hasText: 'Atlas Transport' }).first();
  await expect(card.getByText('À régler')).toBeVisible();
  await card.getByRole('button', { name: 'Enregistrer le paiement' }).click();
  await expect(card.getByText('Réglé', { exact: true })).toBeVisible();
  expect(
    sql(
      "select status, paid_cents = total_cents from public.commission_statements where company_id = '00000000-0000-4000-b000-000000000001' order by month desc limit 1",
    ),
  ).toBe('paid|t');

  // Supervision of marketplace bookings (step 17).
  await page.goto('/fr/admin/bookings?status=completed');
  await expect(page.getByRole('heading', { name: 'Réservations marketplace' })).toBeVisible();
  await expect(page.getByRole('table').getByText(ref)).toBeVisible();
});

test('the carrier owner sees the statement in the Commissions page', async ({ page }) => {
  await signIn(page, 'owner.atlas@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/app$/);
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Commissions' })
    .click();
  await expect(page.getByRole('heading', { name: 'Commissions plateforme' })).toBeVisible();
  await expect(page.getByRole('table').getByRole('cell', { name: 'Réglé' })).toBeVisible();
});
