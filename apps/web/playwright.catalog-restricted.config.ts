import { defineConfig } from '@playwright/test';

import { E2E_CATALOG_RESTRICTED_PODCAST_INDEX_IDS } from './e2e/helpers/catalogRestricted';
import { buildE2eWebServers } from './playwright.e2e-webservers';

/**
 * Catalog-restricted lane: Music off, Add by RSS off, and a Podcast Index id
 * allowlist on the web sidecar and the API (see e2e/helpers/catalogRestricted.ts).
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: '../../.artifacts/e2e-test-results/web-catalog-restricted',
  testMatch: '**/catalog-restricted-*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 10_000,
  reporter: 'list',
  webServer: buildE2eWebServers({
    catalog: {
      musicDisabled: true,
      addByRSSDisabled: true,
      podcastIndexIdAllowlist: E2E_CATALOG_RESTRICTED_PODCAST_INDEX_IDS,
    },
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
