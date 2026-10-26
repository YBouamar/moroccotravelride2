import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { expect, type Page } from '@playwright/test';

export const DEMO_PASSWORD = 'Demo-Mtr-2026';
const MAILPIT = 'http://127.0.0.1:55324/api/v1';

/** Turnstile test keys pass automatically, but the token arrives asynchronously. */
export async function waitForCaptcha(page: Page) {
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, {
    // The widget loads from Cloudflare: allow for a slow network under parallel load.
    timeout: 40_000,
  });
}

export async function signIn(
  page: Page,
  email: string,
  password = DEMO_PASSWORD,
  path = '/fr/login',
) {
  // Every test signs in from 127.0.0.1: reset the login counters so that the production limits
  // (20 attempts per IP, 8 per e-mail, per 15 minutes) do not throttle the suite itself.
  sql("delete from private.rate_limits where key like 'login-%'");
  await page.goto(path);
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await waitForCaptcha(page);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

/** Signs a new carrier up through the form and confirms the e-mail; lands on /fr/app. */
export async function signUpAndConfirm(page: Page, baseURL: string, legalName: string) {
  const email = `carrier-${Date.now()}-${Math.floor(Math.random() * 1000)}@moroccotravelride.test`;
  await page.goto('/fr/signup');
  await page.getByLabel('Votre nom complet').fill('Test Transporteur');
  await page.getByLabel('Raison sociale de la société').fill(legalName);
  await page.getByLabel('Ville du siège').selectOption({ label: 'Casablanca' });
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill('Test-Ride-2026');
  await page.getByLabel("J'accepte les conditions générales d'utilisation").check();
  await waitForCaptcha(page);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page.getByText('Vérifiez votre boîte mail')).toBeVisible();
  await page.goto(await confirmLinkFor(email, baseURL));
  await expect(page).toHaveURL(/\/fr\/app$/);
  return email;
}

/**
 * Reads the latest auth e-mail sent to `email` by the local Supabase (Mailpit) and returns the
 * /api/auth/confirm link, pointed at the server under test.
 */
export async function confirmLinkFor(email: string, baseURL: string): Promise<string> {
  let messageId: string | undefined;
  await expect
    .poll(
      async () => {
        const response = await fetch(
          `${MAILPIT}/search?query=${encodeURIComponent(`to:"${email}"`)}`,
        );
        const body = (await response.json()) as { messages: { ID: string }[] };
        messageId = body.messages[0]?.ID;
        return messageId;
      },
      { timeout: 20_000 },
    )
    .toBeTruthy();

  const message = (await (await fetch(`${MAILPIT}/message/${messageId}`)).json()) as {
    HTML: string;
  };
  const href = message.HTML.match(/href="([^"]*\/api\/auth\/confirm[^"]*)"/)?.[1];
  if (!href) throw new Error(`No confirmation link in the e-mail sent to ${email}`);
  const url = new URL(href.replaceAll('&amp;', '&'));
  return `${baseURL}${url.pathname}${url.search}`;
}

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s), as computed by authenticator apps. */
export function totp(secret: string, now = Date.now()): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...secret.replace(/=+$/, '').toUpperCase()]
    .map((char) => alphabet.indexOf(char).toString(2).padStart(5, '0'))
    .join('');
  const key = Buffer.from(
    Array.from({ length: Math.floor(bits.length / 8) }, (_, i) =>
      parseInt(bits.slice(i * 8, i * 8 + 8), 2),
    ),
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const hmac = createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  return ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
}

/** Runs SQL as postgres on the local Supabase database (test fixtures only). */
export function sql(query: string): string {
  return execFileSync(
    'docker',
    ['exec', 'supabase_db_moroccotravelride', 'psql', '-U', 'postgres', '-tA', '-c', query],
    { encoding: 'utf8' },
  ).trim();
}

// TOTP secret of the demo admin, known once enrolled in this worker (factors reset by global-setup).
let adminSecret: string | undefined;
let lastTotpWindow = -1;

/** A code for a 30 s window not used yet (an authenticator code is accepted only once). */
async function freshCode(secret: string): Promise<string> {
  const window = Math.floor(Date.now() / 30_000);
  if (window === lastTotpWindow) {
    await new Promise((resolve) => setTimeout(resolve, 30_000 - (Date.now() % 30_000) + 500));
  }
  lastTotpWindow = Math.floor(Date.now() / 30_000);
  return totp(secret);
}

/** Signs the demo admin in: TOTP enrollment the first time, then the code challenge. */
export async function signInAsAdmin(page: Page) {
  await signIn(page, 'admin@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/mfa$/);
  if (!adminSecret) {
    await page.getByRole('button', { name: "Configurer l'application" }).click();
    adminSecret = (await page.locator('code').textContent())?.trim() ?? '';
  }
  await page.getByLabel('Code à 6 chiffres').fill(await freshCode(adminSecret));
  await page.getByRole('button', { name: 'Vérifier' }).click();
  await expect(page).toHaveURL(/\/fr\/admin$/);
}
