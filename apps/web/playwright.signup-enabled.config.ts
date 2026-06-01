import { defineConfig } from '@playwright/test';

import { buildE2eWebServers } from './playwright.e2e-webservers';

/** Runs public email signup E2E (API + web `user_signup_email` mode). */
export default defineConfig({
  testDir: './e2e',
  outputDir: '../../.artifacts/e2e-test-results/web-signup-enabled',
  testMatch: '**/sign-up-legal-consent.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  reporter: 'list',
  webServer: buildE2eWebServers({
    userSignupEmail: true,
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
