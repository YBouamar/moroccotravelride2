import { expect, test, type Page } from '@playwright/test';

/** On mobile the public header links sit behind the Menu button. */
async function openSiteMenu(page: Page) {
  const menu = page.locator('button[aria-controls="site-menu"]');
  if (await menu.isVisible()) await menu.click();
}

test.describe('with an unsupported browser language', () => {
  test.use({ locale: 'de-DE' });
  test('redirects / to the default French locale', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/fr$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });
});

test.describe('with an Arabic browser', () => {
  test.use({ locale: 'ar-MA' });
  test('redirects / to Arabic', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/ar$/);
  });
});

test('switches language and flips to RTL for Arabic', async ({ page }) => {
  await page.goto('/fr');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

  await openSiteMenu(page);
  await page.getByRole('link', { name: 'العربية' }).click();
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'سافر عبر المغرب مع ناقلين معتمدين',
  );

  await openSiteMenu(page);
  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});

test('keeps the current page when switching language', async ({ page }) => {
  await page.goto('/fr/signup');
  await page.getByRole('link', { name: 'العربية' }).click();
  await expect(page).toHaveURL(/\/ar\/signup$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('تسجيل شركة النقل الخاصة بي');
});

test('keeps the query string when switching language', async ({ page }) => {
  await page.goto('/fr/login?next=%2Ffr%2Fapp');
  await page.getByRole('link', { name: 'العربية' }).click();
  await expect(page).toHaveURL(/\/ar\/login\?next=%2Ffr%2Fapp$/);
});

test('renders a localized 404 for unknown pages', async ({ page }) => {
  const response = await page.goto('/en/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
});

// Public pages; signed-in pages are covered by auth.spec.ts and the mobile screenshots.
for (const path of ['/fr', '/ar', '/fr/signup', '/ar/login']) {
  test(`has no horizontal overflow on ${path}`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
