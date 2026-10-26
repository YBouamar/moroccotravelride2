import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { DEMO_PASSWORD } from './helpers';

// Access token of the demo driver, as the driver app gets it (Supabase Auth password grant).
async function driverToken(): Promise<string> {
  const status = JSON.parse(
    execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
      encoding: 'utf8',
      shell: true,
    }),
  ) as { API_URL: string; PUBLISHABLE_KEY: string };
  const response = await fetch(`${status.API_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: status.PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'driver.atlas@moroccotravelride.test', password: DEMO_PASSWORD }),
  });
  return ((await response.json()) as { access_token: string }).access_token;
}

const ATLAS = '00000000-0000-4000-b000-000000000001';
const SAHARA = '00000000-0000-4000-b000-000000000002';
// Smallest valid PNG signature followed by padding: enough for the real-type check.
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);

test('driver receipts go through the server, which checks rights and the real file type', async ({
  request,
}) => {
  const token = await driverToken();
  const send = (companyId: string, buffer: Buffer, auth = true) =>
    request.post('/api/driver/receipts', {
      headers: auth ? { Authorization: `Bearer ${token}` } : {},
      multipart: {
        companyId,
        clientRef: crypto.randomUUID(),
        file: { name: 'receipt.jpg', mimeType: 'image/jpeg', buffer },
      },
    });

  expect((await send(ATLAS, PNG, false)).status()).toBe(401);
  expect((await send(ATLAS, Buffer.from('MZ not an image'))).status()).toBe(415);
  expect((await send(SAHARA, PNG)).status()).toBe(403);
  const accepted = await send(ATLAS, PNG);
  expect(accepted.status()).toBe(200);
  expect(((await accepted.json()) as { path: string }).path).toMatch(
    new RegExp(`^${ATLAS}/[0-9a-f-]{36}[.]png$`),
  );
});
