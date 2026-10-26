import { expect, test } from '@playwright/test';
import { signIn, sql } from './helpers';

// Serial: the last test hides the carrier for a moment, which would empty the searches.
test.describe.configure({ mode: 'serial' });

/** Calendar day in Morocco, `offset` days from today. */
function moroccoDay(offset: number): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(
    new Date(),
  );
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

test('a traveler searches a transfer and sees the verified carriers with their prices', async ({
  page,
}) => {
  await page.goto('/fr');
  await page.getByLabel('Départ').selectOption({ label: 'Casablanca' });
  await page.getByLabel('Arrivée').selectOption({ label: 'Marrakech' });
  await page.getByLabel('Date').fill(moroccoDay(3));
  await page.getByLabel('Heure de prise en charge').fill('09:00');
  await page.getByLabel('Passagers').fill('3');
  await page.getByRole('button', { name: 'Rechercher' }).click();

  await expect(page).toHaveURL(/\/fr\/search\?/);
  await expect(page.getByRole('heading', { name: 'Casablanca vers Marrakech' })).toBeVisible();
  // Atlas: sedan 800 MAD (3 seats), 4x4 1 000 MAD, van 1 200 MAD ; Sahara: van 1 100 MAD.
  await expect(page.getByText('Transporteur agréé : Atlas Transport')).toHaveCount(3);
  await expect(page.getByText('Transporteur agréé : Sahara Tours')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Réserver' }).first()).toHaveAttribute(
    'href',
    /\/fr\/book\?offer=/,
  );

  // 7 passengers: only the vans remain.
  await page.getByLabel('Passagers').fill('7');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await expect(page.getByRole('link', { name: 'Réserver' })).toHaveCount(2);
});

test('a pickup sooner than 24 hours is refused', async ({ page }) => {
  const casa = sql("select id from public.cities where slug = 'casablanca'");
  const rak = sql("select id from public.cities where slug = 'marrakech'");
  await page.goto(
    `/fr/search?from=${casa}&to=${rak}&date=${moroccoDay(0)}&time=00:00&passengers=2`,
  );
  await expect(page.getByText(/au moins 24 h avant la prise en charge/)).toBeVisible();
});

test('the owner manages the price grid and the marketplace visibility', async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, 'owner.atlas@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/app$/);
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Marketplace' })
    .click();
  await expect(page.getByText('Votre société apparaît sur la marketplace')).toBeVisible();

  await page.getByLabel('Départ').selectOption({ label: 'Rabat' });
  await page.getByLabel('Arrivée').selectOption({ label: 'Casablanca' });
  await page.getByLabel('Type de véhicule').selectOption({ label: 'Berline' });
  await page.getByLabel('Prix tout compris (MAD)').fill('550');
  await page.getByRole('button', { name: 'Enregistrer le prix' }).click();
  await expect
    .poll(() =>
      sql(
        "select count(*) from public.price_grids g join public.cities f on f.id = g.from_city_id join public.cities t on t.id = g.to_city_id where g.company_id = '00000000-0000-4000-b000-000000000001' and g.price_cents = 55000 and f.slug in ('rabat', 'casablanca') and t.slug in ('rabat', 'casablanca')",
      ),
    )
    .toBe('2');

  await page.getByRole('button', { name: 'Masquer ma société' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.getByText("Votre société n'apparaît pas sur la marketplace")).toBeVisible();
  await page.getByRole('button', { name: 'Activer ma visibilité' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.getByText('Votre société apparaît sur la marketplace')).toBeVisible();
  sql(
    "delete from public.price_grids where company_id = '00000000-0000-4000-b000-000000000001' and price_cents = 55000",
  );
});
