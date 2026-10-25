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
