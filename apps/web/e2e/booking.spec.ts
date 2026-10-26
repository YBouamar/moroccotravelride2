import { expect, test } from '@playwright/test';
import { signIn, sql, waitForCaptcha } from './helpers';

test.describe.configure({ mode: 'serial' });

function moroccoDay(offset: number): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(
    new Date(),
  );
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

let bookingUrl = '';
let bookingRef = '';

test('Phase 3 acceptance: a guest books an 800 MAD transfer, 160 MAD commission and 640 MAD carrier share', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const email = `voyageur-${Date.now()}@example.test`;
  const casa = sql("select id from public.cities where slug = 'casablanca'");
  const rak = sql("select id from public.cities where slug = 'marrakech'");
  await page.goto(
    `/fr/search?from=${casa}&to=${rak}&date=${moroccoDay(5)}&time=09:00&passengers=2`,
  );

  // Atlas sedan at 800 MAD is the cheapest offer.
  await page.getByRole('link', { name: 'Réserver' }).first().click();
  await expect(page.getByRole('heading', { name: 'Votre réservation' })).toBeVisible();
  await page.getByLabel('Nom complet').fill('Emma Martin');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Téléphone (avec indicatif)').fill('+33 6 00 00 00 01');
  await page.getByLabel('Adresse de prise en charge').fill('Gare Casa Port');
  await page.getByLabel('Adresse de dépose').fill('Riad Atlas Palace, Médina');
  await page.getByLabel('Numéro de vol (facultatif)').fill('AT 201');
  await page.getByLabel(/Virement au transporteur/).check();
  await page.getByLabel(/J'accepte les conditions générales/).check();
  await waitForCaptcha(page);
  await page.getByRole('button', { name: 'Confirmer la réservation' }).click();

  // No token in the URL: the access cookie is set by the server (security audit, finding 5).
  await expect(page).toHaveURL(/\/fr\/booking\/MTR-[A-Z0-9]{6}$/);
  bookingUrl = page.url();
  bookingRef = bookingUrl.match(/MTR-[A-Z0-9]{6}/)![0];
  await expect(page.getByText('En attente du transporteur')).toBeVisible();
  expect(
    sql(
      `select total_cents, commission_cents, carrier_cents, payment_method from public.bookings where public_ref = '${bookingRef}'`,
    ),
  ).toBe('80000|16000|64000|bank_transfer');
  // Traveler and carrier e-mails are queued (sent when a Resend key is configured).
  await expect
    .poll(() =>
      sql(
        `select string_agg(template, ',' order by template) from public.email_outbox o join public.bookings b on b.id = o.booking_id where b.public_ref = '${bookingRef}'`,
      ),
    )
    .toMatch(/booking_new_for_carrier.*booking_received/);
});

test('the carrier accepts the booking, which lands in the planning', async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, 'manager.atlas@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/app$/);
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: /Réservations/ })
    .click();
  const card = page.locator('li', { hasText: bookingRef });
  await expect(card.getByText(/À accepter dans \d+ min/)).toBeVisible();
  await card.getByLabel('Durée estimée').selectOption('240');
  await card.getByRole('button', { name: 'Accepter' }).click();
  await expect(card.getByText('Confirmée', { exact: true })).toBeVisible();
  expect(
    sql(
      `select t.origin, t.status, (extract(epoch from t.ends_at - t.starts_at) / 60)::int from public.trips t join public.bookings b on b.trip_id = t.id where b.public_ref = '${bookingRef}'`,
    ),
  ).toBe('marketplace|planned|240');
});

test('the traveler sees the bank details and cancels for free before paying', async ({
  page,
  baseURL,
}) => {
  // A new browser opens the e-mail link: the token travels in the fragment, never to the server.
  const emailLink = sql(
    `select o.payload ->> 'link' from public.email_outbox o join public.bookings b on b.id = o.booking_id where b.public_ref = '${bookingRef}' and o.template = 'booking_received'`,
  );
  expect(emailLink).toContain(`/fr/booking/${bookingRef}#t=`);
  const link = new URL(emailLink);
  await page.goto(`${baseURL}${link.pathname}${link.hash}`);
  await expect(page).toHaveURL(new RegExp(`/fr/booking/${bookingRef}$`));
  await expect(page.getByText('Confirmée', { exact: true })).toBeVisible();
  await expect(page.getByText('011780000012345678901234')).toBeVisible();
  await expect(
    page.getByText("Rien n'a encore été payé : l'annulation est sans frais.").first(),
  ).toBeVisible();

  // A tampered link opened in another browser shows nothing.
  const other = await page.context().browser()!.newPage();
  await other.goto(`${baseURL}/fr/booking/${bookingRef}#t=123.forged`);
  await expect(other.getByText('Ce lien est invalide ou a expiré.')).toBeVisible();
  await other.close();

  await page.goto(bookingUrl);
  await page.getByRole('button', { name: 'Annuler la réservation' }).click();
  await page.getByRole('dialog').getByRole('button', { name: "Confirmer l'annulation" }).click();
  await expect(page.getByText('Annulée par vous')).toBeVisible();
  expect(
    sql(
      `select b.status, b.refund_cents, t.status from public.bookings b join public.trips t on t.id = b.trip_id where b.public_ref = '${bookingRef}'`,
    ),
  ).toBe('cancelled_by_traveler|0|cancelled');
});
