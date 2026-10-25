import { expect, test } from '@playwright/test';
import { signUpAndConfirm } from './helpers';

test('a new carrier completes the onboarding: company, license, vehicle, driver', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const legalName = `Onboarding ${Date.now()} SARL`;
  await signUpAndConfirm(page, baseURL!, legalName);

  // The dashboard invites the owner to finish the setup.
  await expect(page.getByText('Terminez la configuration de votre espace')).toBeVisible();
  await page.getByRole('link', { name: 'Continuer la configuration' }).click();
  await expect(page.getByText('0 sur 4 étapes terminées')).toBeVisible();

  // 1. Company details: the ICE must have 15 digits.
  await page.getByRole('link', { name: 'Commencer' }).first().click();
  await expect(page).toHaveURL(/\/fr\/app\/onboarding\/company$/);
  await expect(page.getByLabel('Raison sociale')).toHaveValue(legalName);
  await page.getByLabel('ICE').fill('123');
  await page.getByLabel('Identifiant fiscal (IF)').fill('12345678');
  await page.getByLabel('Registre de commerce (RC)').fill('RC 98765');
  await page.getByLabel('Adresse du siège').fill('12 boulevard Zerktouni');
  await page.getByLabel("Numéro d'agrément de transport touristique").fill('TT-2026-042');
  await page.getByLabel("Date d'expiration de l'agrément").fill('2030-06-30');
  await page.getByRole('button', { name: 'Enregistrer et continuer' }).click();
  await expect(page.getByText("L'ICE comporte 15 chiffres.")).toBeVisible();
  await page.getByLabel('ICE').fill('001234567000089');
  await page.getByRole('button', { name: 'Enregistrer et continuer' }).click();

  // 2. Documents: a renamed non-PDF file is refused, a real PDF is accepted.
  await expect(page).toHaveURL(/\/fr\/app\/onboarding\/documents$/);
  await expect(page.getByText("L'agrément de transport touristique est obligatoire")).toBeVisible();
  await page.getByLabel('Fichier').setInputFiles({
    name: 'agrement.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('MZ this is not a PDF'),
  });
  await page.getByRole('button', { name: 'Déposer le document' }).click();
  await expect(page.getByText('Format non accepté')).toBeVisible();

  await page.getByLabel('Fichier').setInputFiles({
    name: 'agrement.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\n%%EOF'),
  });
  await page.getByRole('button', { name: 'Déposer le document' }).click();
  await expect(page.getByText('À vérifier')).toBeVisible();
  await page.getByRole('link', { name: 'Enregistrer et continuer' }).click();

  // 3. First vehicle (choosing a type suggests its indicative capacity).
  await expect(page).toHaveURL(/\/fr\/app\/onboarding\/vehicle$/);
  await page.getByLabel('Immatriculation').fill('12345-a-6');
  await page.getByLabel('Marque').fill('Mercedes');
  await page.getByLabel('Modèle').fill('Vito');
  await page.getByLabel('Type de véhicule').selectOption('van');
  await expect(page.getByLabel('Places passagers')).toHaveValue('7');
  await page.getByRole('button', { name: 'Enregistrer et continuer' }).click();

  // 4. First driver.
  await expect(page).toHaveURL(/\/fr\/app\/onboarding\/driver$/);
  await page.getByLabel('Nom complet').fill('Youssef El Amrani');
  await page.getByLabel('Téléphone').fill('+212 6 12 34 56 78');
  await page.getByLabel('Numéro de permis de conduire').fill('D-123456');
  await page.getByLabel("Date d'expiration du permis").fill('2031-01-31');
  await page.getByLabel('Français').check();
  await page.getByLabel('Arabe').check();
  await page.getByRole('button', { name: 'Enregistrer et continuer' }).click();

  // Done: every step checked, the dashboard card disappears.
  await expect(page).toHaveURL(/\/fr\/app\/onboarding$/);
  await expect(page.getByText('Configuration terminée')).toBeVisible();
  await expect(page.getByText('4 sur 4 étapes terminées')).toBeVisible();
  await page.goto('/fr/app');
  await expect(page.getByText('Terminez la configuration de votre espace')).toHaveCount(0);
});

test('a duplicate vehicle registration is refused', async ({ page, baseURL }) => {
  test.setTimeout(60_000);
  await signUpAndConfirm(page, baseURL!, `Duplicate ${Date.now()} SARL`);
  for (const attempt of [1, 2]) {
    await page.goto('/fr/app/onboarding/vehicle');
    await page.getByLabel('Immatriculation').fill('99999-B-1');
    await page.getByLabel('Marque').fill('Toyota');
    await page.getByLabel('Modèle').fill('Hiace');
    await page.getByLabel('Type de véhicule').selectOption('minibus');
    await page.getByRole('button', { name: 'Enregistrer et continuer' }).click();
    if (attempt === 1) await expect(page).toHaveURL(/\/fr\/app\/onboarding\/driver$/);
  }
  await expect(page.getByText('Ce véhicule est déjà enregistré.')).toBeVisible();
});

test('a driver with an expired license is accepted with a warning (Q24)', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(60_000);
  await signUpAndConfirm(page, baseURL!, `Expired ${Date.now()} SARL`);
  await page.goto('/fr/app/onboarding/driver');
  await page.getByLabel('Nom complet').fill('Hamid Benali');
  await page.getByLabel('Téléphone').fill('+212 6 98 76 54 32');
  await page.getByLabel('Numéro de permis de conduire').fill('D-654321');
  await page.getByLabel("Date d'expiration du permis").fill('2020-01-31');
  await page.getByRole('button', { name: 'Enregistrer et continuer' }).click();
  await expect(page).toHaveURL(/\/fr\/app\/onboarding$/);

  await page.goto('/fr/app/onboarding/driver');
  await expect(page.getByText('Permis expiré', { exact: true })).toBeVisible();
  await expect(page.getByText('ne pourra pas être affecté à une prestation')).toBeVisible();
});
