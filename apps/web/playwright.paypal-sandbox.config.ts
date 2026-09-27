import { defineConfig } from '@playwright/test';

/** Live PayPal sandbox renewal. Default `make e2e_*` targets ignore this spec. */
export default defineConfig({
  testDir: './e2e',
  outputDir: '../../.artifacts/e2e-test-results/web-paypal-sandbox',
  testMatch: '**/checkout-paypal-sandbox.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: 'list',
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
