import { expect, test } from '@playwright/test';

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

  await page.getByRole('link', { name: 'العربية' }).click();
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'تنقلاتك في المغرب، محجوزة بكل ثقة',
  );

  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});

test('keeps the current page when switching language', async ({ page }) => {
  await page.goto('/fr/app');
  await page.getByRole('link', { name: 'العربية' }).click();
  await expect(page).toHaveURL(/\/ar\/app$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('لوحة القيادة');
});

test('renders a localized 404 for unknown pages', async ({ page }) => {
  const response = await page.goto('/en/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
});

for (const path of ['/fr', '/ar', '/fr/app', '/ar/app']) {
  test(`has no horizontal overflow on ${path}`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
