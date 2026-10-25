import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { expect, type Page } from '@playwright/test';

export const DEMO_PASSWORD = 'Demo-Mtr-2026';
const MAILPIT = 'http://127.0.0.1:54324/api/v1';

/** Turnstile test keys pass automatically, but the token arrives asynchronously. */
export async function waitForCaptcha(page: Page) {
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, {
    timeout: 20_000,
  });
}

export async function signIn(
  page: Page,
  email: string,
  password = DEMO_PASSWORD,
  path = '/fr/login',
) {
  await page.goto(path);
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await waitForCaptcha(page);
  await page.getByRole('button', { name: 'Se connecter' }).click();
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

/** Signs the demo admin in and completes TOTP enrollment (factors are reset by global-setup). */
export async function signInAsAdmin(page: Page) {
  await signIn(page, 'admin@moroccotravelride.test');
  await expect(page).toHaveURL(/\/fr\/mfa$/);
  await page.getByRole('button', { name: "Configurer l'application" }).click();
  const secret = (await page.locator('code').textContent())?.trim() ?? '';
  await page.getByLabel('Code à 6 chiffres').fill(totp(secret));
  await page.getByRole('button', { name: 'Vérifier' }).click();
  await expect(page).toHaveURL(/\/fr\/admin$/);
}
