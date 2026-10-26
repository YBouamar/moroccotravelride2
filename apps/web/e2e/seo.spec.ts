import { expect, test } from '@playwright/test';

test('robots.txt keeps private areas out of search engines', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /api/');
  expect(robots).toContain('Disallow: /*/app');
  expect(robots).toContain('Disallow: /*/booking/');
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
});

test('the sitemap lists the city pages in the three languages', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const locale of ['fr', 'en', 'ar'])
    expect(sitemap).toContain(`/${locale}/transfers/casablanca`);
  expect(sitemap).toContain('/fr/legal/privacy');
});

test('a city page shows its routes with "from" prices, canonical and hreflang links', async ({
  page,
}) => {
  await page.goto('/fr/transfers/casablanca');
  await expect(
    page.getByRole('heading', { name: 'Transferts depuis Casablanca', level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(/Casablanca \/ Marrakech/)).toBeVisible();
  await expect(page.getByText(/à partir de 800/).first()).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/fr\/transfers\/casablanca$/,
  );
  await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute(
    'href',
    /\/ar\/transfers\/casablanca$/,
  );
  await expect(page).toHaveTitle(/Transferts depuis Casablanca/);
});

test('legal pages are reachable from the footer', async ({ page }) => {
  await page.goto('/fr');
  await page
    .getByRole('contentinfo')
    .getByRole('link', { name: 'Politique de confidentialité' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Politique de confidentialité', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText('Positions des chauffeurs : 90 jours.', { exact: false }),
  ).toBeVisible();
});
