import { defineConfig } from '@playwright/test';

import { buildE2eWebServers } from './playwright.e2e-webservers';

export default defineConfig({
  testDir: './e2e',
  testIgnore: [
    '**/cloudflare-web-analytics-enabled.spec.ts',
    '**/cookie-consent-enabled.spec.ts',
    '**/sign-up-legal-consent.spec.ts',
  ],
  outputDir: '../../.artifacts/e2e-test-results/web',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 10_000,
  reporter: 'list',
  webServer: buildE2eWebServers(),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4032',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
