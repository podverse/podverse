import { defineConfig } from '@playwright/test';

const E2E_REPORT_BASE = '.artifacts/e2e-reports';

/**
 * Management-api test server env: shared `DB_HOST`/`DB_PORT` plus `DB_APP_*` and
 * `DB_MANAGEMENT_*`. Test stack uses Postgres on 5732; see apps/management-api/vitest.setup.ts.
 */
const MANAGEMENT_API_ENV = [
  `NODE_ENV=test`,
  `SERVER_ENV=local`,
  `BRAND_NAME=PodverseTest`,
  `LOG_LEVEL=error`,
  // Auth
  `AUTH_JWT_SECRET=11111111-1111-4111-8111-111111111111`,
  `AUTH_JWT_EXPIRES_IN=365d`,
  `AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY=false`,
  // API
  `API_PORT=4130`,
  `API_PREFIX=/api`,
  `API_VERSION=/v1`,
  `COOKIE_DOMAIN=localhost`,
  `API_ALLOWED_CORS_ORIGINS=http://localhost:4132`,
  // Database (test stack: port 5732)
  `DB_HOST=127.0.0.1`,
  `DB_PORT=5732`,
  `DB_APP_NAME=podverse_app_test`,
  `DB_APP_READ_USER=podverse_app_read`,
  `DB_APP_READ_PASSWORD=test`,
  `DB_APP_READ_WRITE_USER=podverse_app_read_write`,
  `DB_APP_READ_WRITE_PASSWORD=test`,
  `DB_MANAGEMENT_NAME=podverse_management_test`,
  `DB_MANAGEMENT_READ_USER=podverse_management_read`,
  `DB_MANAGEMENT_READ_PASSWORD=test`,
  `DB_MANAGEMENT_READ_WRITE_USER=podverse_management_read_write`,
  `DB_MANAGEMENT_READ_WRITE_PASSWORD=test`,
  // Web
  `WEB_PROTOCOL=http`,
  `WEB_DOMAIN=localhost`,
].join(' ');

const MANAGEMENT_SIDECAR_ENV = [
  `PORT=4131`,
  `API_URL=http://localhost:4130`,
  // Sidecar serves NEXT_PUBLIC_* via /runtime-config
  `NEXT_PUBLIC_API_PROTOCOL=http`,
  `NEXT_PUBLIC_API_HOST=localhost`,
  `NEXT_PUBLIC_API_PORT=4130`,
  `NEXT_PUBLIC_API_PREFIX=/api`,
  `NEXT_PUBLIC_API_VERSION=/v1`,
  `NEXT_PUBLIC_SSR_API_PROTOCOL=http`,
  `NEXT_PUBLIC_SSR_API_HOST=localhost`,
  `NEXT_PUBLIC_SSR_API_PORT=4130`,
  `NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE=en-US`,
  `NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES=all-available`,
  `NEXT_PUBLIC_DEFAULT_THEME=dark`,
  `NEXT_PUBLIC_SUPPORTED_THEMES=all-available`,
].join(' ');

const MANAGEMENT_WEB_ENV = [
  `PORT=4132`,
  `RUNTIME_CONFIG_URL=http://localhost:4131`,
  // Next.js build-time env vars (inlined by next build)
  `NEXT_PUBLIC_API_PROTOCOL=http`,
  `NEXT_PUBLIC_API_HOST=localhost`,
  `NEXT_PUBLIC_API_PORT=4130`,
  `NEXT_PUBLIC_API_PREFIX=/api`,
  `NEXT_PUBLIC_API_VERSION=/v1`,
  `NEXT_PUBLIC_SSR_API_PROTOCOL=http`,
  `NEXT_PUBLIC_SSR_API_HOST=localhost`,
  `NEXT_PUBLIC_SSR_API_PORT=4130`,
  `NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE=en-US`,
  `NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES=all-available`,
  `NEXT_PUBLIC_DEFAULT_THEME=dark`,
  `NEXT_PUBLIC_SUPPORTED_THEMES=all-available`,
].join(' ');

export default defineConfig({
  testDir: './e2e',
  outputDir: `../../${E2E_REPORT_BASE}/e2e-test-results/management-web`,
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
      command: `npm run build -w @podverse/management-web-sidecar && ${MANAGEMENT_SIDECAR_ENV} node apps/management-web/sidecar/dist/server.js`,
      port: 4131,
      cwd: '../..',
      timeout: 420_000,
      reuseExistingServer: false,
    },
    {
      command: `${MANAGEMENT_WEB_ENV} npm run build -w @podverse/management-web && NODE_OPTIONS="--disable-warning=DEP0060" ${MANAGEMENT_WEB_ENV} npm run start -w @podverse/management-web -- -p 4132`,
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
