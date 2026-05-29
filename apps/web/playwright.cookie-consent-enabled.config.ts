import { defineConfig } from '@playwright/test';

import { buildE2eWebServers } from './playwright.e2e-webservers';

/** Runs cookie-consent banner + Cloudflare integration E2E (sidecar env + consent gating). */
export default defineConfig({
  testDir: './e2e',
  outputDir: '../../.artifacts/e2e-test-results/web-cookie-consent-enabled',
  testMatch: '**/cookie-consent-enabled.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 10_000,
  reporter: 'list',
  webServer: buildE2eWebServers({
    cloudflareWebAnalyticsEnabled: true,
    cookieConsentBannerEnabled: true,
  }),
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
