import { defineConfig } from '@playwright/test';

import {
  MANAGEMENT_SIDECAR_ENV_FOR_PLAYWRIGHT,
  MANAGEMENT_WEB_ENV_FOR_PLAYWRIGHT,
  buildManagementApiEnvBucketOffForPlaywright,
} from './playwright.management-api-env';

const E2E_REPORT_BASE = '.artifacts/e2e-reports';

const MANAGEMENT_API_ENV = buildManagementApiEnvBucketOffForPlaywright();

export default defineConfig({
  testDir: './e2e',
  outputDir: `../../${E2E_REPORT_BASE}/e2e-test-results/management-web`,
  testIgnore: '**/storage-superuser-crud-enabled.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 10_000,
  reporter: 'list',
  webServer: [
    {
      command: `npm run build -w @podverse/management-api && ${MANAGEMENT_API_ENV} npm run start -w @podverse/management-api`,
      port: 4130,
      cwd: '../..',
      timeout: 420_000,
      reuseExistingServer: false,
    },
    {
      command: `npm run build -w @podverse/management-web-sidecar && ${MANAGEMENT_SIDECAR_ENV_FOR_PLAYWRIGHT} node apps/management-web/sidecar/dist/server.js`,
      port: 4131,
      cwd: '../..',
      timeout: 420_000,
      reuseExistingServer: false,
    },
    {
      command: `${MANAGEMENT_WEB_ENV_FOR_PLAYWRIGHT} npm run build -w @podverse/management-web && NODE_OPTIONS="--disable-warning=DEP0060" ${MANAGEMENT_WEB_ENV_FOR_PLAYWRIGHT} npm run start -w @podverse/management-web -- -p 4132`,
      port: 4132,
      cwd: '../..',
      timeout: 420_000,
      reuseExistingServer: false,
    },
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4132',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
