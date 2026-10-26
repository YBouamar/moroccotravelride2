import { expect, test } from '@playwright/test';
import { signIn, sql } from './helpers';

test('the live map lists the trips in progress with their last position', async ({ page }) => {
  test.setTimeout(60_000);
  // A dedicated trip (never the seeded ones, used by other tests running in parallel).
  sql(
    "update public.trips set status = 'cancelled', cancel_reason = 'e2e' where passenger_name = 'Suivi E2E' and status not in ('completed', 'cancelled')",
  );
  const tripId = sql(`
    with created as (insert into public.trips (company_id, passenger_name, passengers, pickup_city_id, pickup_address,
      dropoff_city_id, dropoff_address, starts_at, ends_at, vehicle_id, driver_id)
    select '00000000-0000-4000-b000-000000000001', 'Suivi E2E', 1, c.id, 'Gare', c.id, 'Riad',
      now() + interval '10 days', now() + interval '10 days 1 hour',
      '00000000-0000-4000-9000-000000000103', '00000000-0000-4000-9000-000000000201'
    from public.cities c where c.slug = 'casablanca' returning id)
    select id from created`);
  sql(`update public.trips set status = 'in_progress' where id = '${tripId}'`);
  sql(`insert into public.driver_locations (company_id, trip_id, driver_id, latitude, longitude, accuracy_m, recorded_at)
       select company_id, id, driver_id, 33.5731, -7.5898, 10, now() from public.trips where id = '${tripId}'`);

  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /Content Security Policy/.test(message.text()))
      errors.push(message.text());
  });
  await signIn(page, 'owner.atlas@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/app$/);
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Suivi en direct' })
    .click();
  await expect(page.getByRole('heading', { name: 'Suivi en direct' })).toBeVisible();
  await expect(page.getByText('Youssef Chauffeur · 34567-A-6')).toBeVisible();
  await expect(page.getByText(/Dernière position à/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Carte des trajets en cours' })).toBeVisible();
  expect(errors).toEqual([]);

  sql(`delete from public.driver_locations where trip_id = '${tripId}'`);
  sql(`update public.trips set status = 'cancelled', cancel_reason = 'e2e' where id = '${tripId}'`);
});
