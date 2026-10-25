import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('a Standard carrier sees locked V2 features and the offers comparison', async ({ page }) => {
  await signIn(page, 'owner.sahara@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/app$/);

  // V2 / V3 sections are visible but locked, with the offer that unlocks them (BR-104).
  const expenses = page.getByRole('link', { name: /Dépenses/ });
  await expect(expenses).toContainText('V2');
  await expect(page.getByRole('link', { name: /Parc/ })).toContainText('V3');
  await expenses.click();
  await expect(page).toHaveURL(/\/fr\/app\/subscription$/);

  await expect(page.getByRole('heading', { name: 'Abonnement', level: 1 })).toBeVisible();
  await expect(page.getByText('Votre offre')).toBeVisible();
  await expect(page.getByText('Sur devis')).toBeVisible();
  await expect(page.getByText('150 MAD')).toBeVisible();
  await expect(page.getByText('400 MAD')).toBeVisible();
  // Subscription link is the active navigation item.
  await expect(page.getByRole('link', { name: 'Abonnement' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('a company on trial sees how many days are left', async ({ page }) => {
  await signIn(page, 'owner.oasis@moroccotravelride.test');
  await expect(page.getByText(/Essai gratuit : 1[34] jours restants\./)).toBeVisible();
  // V2 trial: V2 sections are included (soon), V3 ones are locked.
  await expect(page.getByRole('link', { name: /Parc/ })).toContainText('V3');
  await expect(page.getByRole('link', { name: /Dépenses/ })).toHaveCount(0);
});
