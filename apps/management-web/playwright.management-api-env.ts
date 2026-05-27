/**
 * Env fragments for Playwright-spawned management-web stack (API + sidecar + Next).
 * Management API env: @podverse/helpers-config `buildPodverseManagementApiTestEnv`.
 */

import {
  buildPodverseManagementApiTestEnv,
  PODVERSE_MANAGEMENT_WEB_E2E_OBSERVABILITY_ENV,
  PODVERSE_SKIP_DOTENV_ENV,
  PODVERSE_STARTUP_VALIDATION_SILENT_ENV,
  toShellEnvPrefix,
} from '@podverse/helpers-config';

/** Default Playwright run: no inherited bucket creds; GET /storage reports disabled. */
export function buildManagementApiEnvBucketOffForPlaywright(): string {
  return toShellEnvPrefix({
    ...buildPodverseManagementApiTestEnv({
      profile: 'managementApiE2e',
      bucketMode: 'off',
    }),
    ...PODVERSE_SKIP_DOTENV_ENV,
  });
}

/**
 * Minimal valid `aws-s3` bucket env so `isBucketStorageEnabled()` is true for storage UI E2E.
 */
export function buildManagementApiEnvFakeAwsForPlaywright(): string {
  return toShellEnvPrefix({
    ...buildPodverseManagementApiTestEnv({
      profile: 'managementApiE2e',
      bucketMode: 'fakeAws',
    }),
    ...PODVERSE_SKIP_DOTENV_ENV,
  });
}

export const MANAGEMENT_SIDECAR_INTEGRATIONS_ENV_DISABLED = [
  `CLOUDFLARE_WEB_ANALYTICS_ENABLED=false`,
  `CLOUDFLARE_WEB_ANALYTICS_TOKEN=`,
].join(' ');

export const MANAGEMENT_SIDECAR_INTEGRATIONS_ENV_ENABLED = [
  `CLOUDFLARE_WEB_ANALYTICS_ENABLED=true`,
  `CLOUDFLARE_WEB_ANALYTICS_TOKEN=e2e-test-cloudflare-token`,
].join(' ');

export type ManagementSidecarEnvOptions = {
  cloudflareWebAnalyticsEnabled?: boolean;
};

export function buildManagementSidecarEnvForPlaywright(
  options?: ManagementSidecarEnvOptions
): string {
  const integrationsEnv =
    options?.cloudflareWebAnalyticsEnabled === true
      ? MANAGEMENT_SIDECAR_INTEGRATIONS_ENV_ENABLED
      : MANAGEMENT_SIDECAR_INTEGRATIONS_ENV_DISABLED;
  return [
    `PORT=4131`,
    `API_URL=http://localhost:4130`,
    integrationsEnv,
    `NEXT_PUBLIC_API_PROTOCOL=http`,
    `NEXT_PUBLIC_API_HOST=localhost`,
    `NEXT_PUBLIC_API_PORT=4130`,
    `NEXT_PUBLIC_API_PREFIX=/api`,
    `NEXT_PUBLIC_API_VERSION=/v2`,
    `NEXT_PUBLIC_SSR_API_PROTOCOL=http`,
    `NEXT_PUBLIC_SSR_API_HOST=localhost`,
    `NEXT_PUBLIC_SSR_API_PORT=4130`,
    `NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE=en-US`,
    `NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES=all-available`,
    `NEXT_PUBLIC_DEFAULT_THEME=dark`,
    `NEXT_PUBLIC_SUPPORTED_THEMES=all-available`,
    toShellEnvPrefix(PODVERSE_STARTUP_VALIDATION_SILENT_ENV),
  ].join(' ');
}

const MANAGEMENT_WEB_E2E_NEXT_PUBLIC_ENV: Record<string, string> = {
  NEXT_PUBLIC_API_PROTOCOL: 'http',
  NEXT_PUBLIC_API_HOST: 'localhost',
  NEXT_PUBLIC_API_PORT: '4130',
  NEXT_PUBLIC_API_PREFIX: '/api',
  NEXT_PUBLIC_API_VERSION: '/v2',
  NEXT_PUBLIC_SSR_API_PROTOCOL: 'http',
  NEXT_PUBLIC_SSR_API_HOST: 'localhost',
  NEXT_PUBLIC_SSR_API_PORT: '4130',
  NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE: 'en-US',
  NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES: 'all-available',
  NEXT_PUBLIC_DEFAULT_THEME: 'dark',
  NEXT_PUBLIC_SUPPORTED_THEMES: 'all-available',
};

/** Env record for the management-web app build and start in E2E mode. */
export function buildManagementWebE2eAppEnv(): Record<string, string> {
  return {
    PORT: '4132',
    RUNTIME_CONFIG_URL: 'http://localhost:4131',
    ...PODVERSE_MANAGEMENT_WEB_E2E_OBSERVABILITY_ENV,
    ...MANAGEMENT_WEB_E2E_NEXT_PUBLIC_ENV,
  };
}

export const MANAGEMENT_WEB_ENV_FOR_PLAYWRIGHT = toShellEnvPrefix(buildManagementWebE2eAppEnv());

/** Playwright webServer command: quiet build + standalone Next.js start (matches Docker). */
export function buildManagementWebE2eStartCommand(): string {
  return `${MANAGEMENT_WEB_ENV_FOR_PLAYWRIGHT} bash scripts/e2e/build-and-start-next-standalone.sh @podverse/management-web`;
}
