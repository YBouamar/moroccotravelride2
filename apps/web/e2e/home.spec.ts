import { expect, test } from '@playwright/test';

test('the home page shows the three offers, destinations and real "from" prices', async ({
  page,
}) => {
  await page.goto('/fr');
  await expect(
    page.getByRole('heading', { name: 'Transferts', level: 3, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Mise à disposition', level: 3, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Voyages organisés', level: 3, exact: true }),
  ).toBeVisible();
  // Lowest seeded price: Marrakech airport transfer, 250 MAD.
  await expect(page.getByText(/À partir de 250/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Marrakech Transferts dès 250/ })).toHaveAttribute(
    'href',
    /\/fr\/transfers\/marrakech$/,
  );
  await expect(page.getByRole('heading', { name: 'Transferts populaires' })).toBeVisible();
  await expect(page.getByText('Prix sur devis').first()).toBeVisible();
});
