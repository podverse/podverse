import { defineConfig } from '@playwright/test';

import { buildE2eWebServers } from './playwright.e2e-webservers';

/** Runs Cloudflare Web Analytics enabled integration E2E (sidecar env + beacon script). */
export default defineConfig({
  testDir: './e2e',
  outputDir: '../../.artifacts/e2e-test-results/web-cloudflare-enabled',
  testMatch: '**/cloudflare-web-analytics-enabled.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 10_000,
  reporter: 'list',
  webServer: buildE2eWebServers({ cloudflareWebAnalyticsEnabled: true }),
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
