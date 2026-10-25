import { expect, test } from '@playwright/test';

test('sends the baseline security headers', async ({ request }) => {
  const response = await request.get('/fr');
  const headers = response.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('geolocation=()');
  expect(headers['permissions-policy']).toContain('camera=()');
  expect(headers['x-powered-by']).toBeUndefined();
});
