import { defineConfig } from '@playwright/test';

import { buildE2eWebServers } from './playwright.e2e-webservers';

/** Built-in themes only (no remote custom theme pack). */
export default defineConfig({
  globalSetup: './e2e/custom-themes-global-setup.mjs',
  testDir: './e2e',
  outputDir: '../../.artifacts/e2e-test-results/web-custom-themes-native',
  testMatch: '**/custom-themes-native-only.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  reporter: 'list',
  webServer: buildE2eWebServers({
    customThemesProfile: 'native',
    testAssetsFirst: true,
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
