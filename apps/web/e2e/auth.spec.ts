import { expect, test } from '@playwright/test';
import { confirmLinkFor, DEMO_PASSWORD, signIn, waitForCaptcha } from './helpers';

// Demo accounts come from supabase/seed.sql (run `pnpm db:reset` first).

test('a carrier owner signs in, sees their company, then signs out', async ({ page }) => {
  await signIn(page, 'owner.atlas@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/app$/);
  await expect(page.getByText('Atlas Transport Touristique SARL')).toBeVisible();
  await expect(page.getByText('Société en attente de vérification')).toHaveCount(0);

  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/fr$/);
  await page.goto('/fr/app');
  await expect(page).toHaveURL(/\/fr\/login\?next=%2Ffr%2Fapp$/);
});

test('each carrier only sees their own company', async ({ page }) => {
  await signIn(page, 'owner.sahara@moroccotravelride.test');
  await expect(page.getByText('Sahara Tours SARL')).toBeVisible();
  await expect(page.getByText('Atlas Transport Touristique SARL')).toHaveCount(0);
});

test('a wrong password shows a generic error', async ({ page }) => {
  await signIn(page, 'manager.atlas@moroccotravelride.test', 'Wrong-Password-1');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Adresse e-mail ou mot de passe incorrect.' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/fr\/login/);
});

test('signing in from a protected page returns to it', async ({ page }) => {
  await page.goto('/fr/app');
  await expect(page).toHaveURL(/\/fr\/login\?next=/);
  await page.getByLabel('Adresse e-mail').fill('manager.atlas@moroccotravelride.test');
  await page.getByLabel('Mot de passe').fill(DEMO_PASSWORD);
  await waitForCaptcha(page);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/fr\/app$/);
});

test('a platform admin must complete MFA before reaching the admin area', async ({ page }) => {
  await signIn(page, 'admin@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/mfa$/);
  // Enrollment or challenge depending on admin.spec.ts having already enrolled a factor.
  await expect(page.getByRole('heading', { name: 'Double authentification' })).toBeVisible();
  await page.goto('/fr/admin');
  await expect(page).toHaveURL(/\/fr\/mfa$/);
});

test('a non-admin cannot see the admin area', async ({ page }) => {
  await signIn(page, 'owner.oasis@moroccotravelride.test');
  await expect(page.getByText('Société en attente de vérification')).toBeVisible();
  const response = await page.goto('/fr/admin');
  expect(response?.status()).toBe(404);
});

test('a new carrier signs up, confirms the e-mail and lands on a pending company', async ({
  page,
  baseURL,
}) => {
  const email = `carrier-${Date.now()}@moroccotravelride.test`;
  await page.goto('/fr/signup');
  await page.getByLabel('Votre nom complet').fill('Test Transporteur');
  await page.getByLabel('Raison sociale de la société').fill('Test Mobilité SARL');
  await page.getByLabel('Ville du siège').selectOption({ label: 'Fès' });
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill('Test-Ride-2026');
  await page.getByLabel("J'accepte les conditions générales d'utilisation").check();
  await waitForCaptcha(page);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page.getByText('Vérifiez votre boîte mail')).toBeVisible();

  await page.goto(await confirmLinkFor(email, baseURL!));
  await expect(page).toHaveURL(/\/fr\/app$/);
  await expect(page.getByText('Test Mobilité SARL')).toBeVisible();
  await expect(page.getByText('Société en attente de vérification')).toBeVisible();
});

test('the sign-up form explains what is wrong', async ({ page }) => {
  await page.goto('/fr/signup');
  await page.getByLabel('Mot de passe').fill('short');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page.getByText('10 caractères minimum.')).toBeVisible();
  await expect(page.getByText('Vous devez accepter les conditions générales.')).toBeVisible();
  await expect(page.getByLabel('Mot de passe')).toHaveAttribute('aria-invalid', 'true');
});

test('a user resets a forgotten password from the e-mail link', async ({ page, baseURL }) => {
  // Fresh account so the demo passwords never change.
  const email = `reset-${Date.now()}@moroccotravelride.test`;
  await page.goto('/fr/signup');
  await page.getByLabel('Votre nom complet').fill('Reset Test');
  await page.getByLabel('Raison sociale de la société').fill('Reset Transport SARL');
  await page.getByLabel('Ville du siège').selectOption({ label: 'Rabat' });
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill('Test-Ride-2026');
  await page.getByLabel("J'accepte les conditions générales d'utilisation").check();
  await waitForCaptcha(page);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page.goto(await confirmLinkFor(email, baseURL!));
  await page.getByRole('button', { name: 'Se déconnecter' }).click();

  await page.goto('/fr/forgot-password');
  await page.getByLabel('Adresse e-mail').fill(email);
  await waitForCaptcha(page);
  await page.getByRole('button', { name: 'Envoyer le lien' }).click();
  await expect(page.getByRole('status')).toContainText('un lien de réinitialisation');

  await page.goto(await confirmLinkFor(email, baseURL!));
  await expect(page).toHaveURL(/\/fr\/reset-password$/);
  await page.getByLabel('Nouveau mot de passe').fill('New-Ride-2027');
  await page.getByLabel('Confirmer le mot de passe').fill('New-Ride-2027');
  await page.getByRole('button', { name: 'Enregistrer le mot de passe' }).click();
  await expect(page).toHaveURL(/\/fr\/app$/);

  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await signIn(page, email, 'New-Ride-2027');
  await expect(page).toHaveURL(/\/fr\/app$/);
});

test('the CSP header carries a nonce used by the page scripts', async ({ page }) => {
  const response = await page.goto('/fr/login');
  const csp = response?.headers()['content-security-policy'] ?? '';
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  expect(nonce).toBeTruthy();
  expect(csp).toContain("frame-ancestors 'none'");
  expect(await page.locator(`script[nonce]`).count()).toBeGreaterThan(0);
});
