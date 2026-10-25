import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
// Locally we reuse the installed Microsoft Edge (no browser download); CI installs Chromium.
const channel = process.env.CI ? undefined : 'msedge';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
    // Auth flows run once (desktop): they create accounts and send e-mails.
    { name: 'mobile', use: { ...devices['Pixel 7'], channel }, testIgnore: /auth.spec.ts/ },
  ],
  // Tests run against the production build, like on the VPS.
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}/fr`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
