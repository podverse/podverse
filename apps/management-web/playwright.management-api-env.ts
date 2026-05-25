/**
 * Env fragments for Playwright-spawned management-web stack (API + sidecar + Next).
 * Keeps default E2E bucket-off (`storage-disabled.spec.ts`) and optional fake-aws
 * (`storage-superuser-crud-enabled.spec.ts`) aligned.
 */

const MANAGEMENT_API_ENV_LINES_COMMON = [
  `NODE_ENV=test`,
  `SERVER_ENV=local`,
  `BRAND_NAME=PodverseTest`,
  `USER_AGENT="Example Bot test/API/5"`,
  `LOG_LEVEL=error`,
  `AUTH_JWT_SECRET=11111111-1111-4111-8111-111111111111`,
  `AUTH_JWT_EXPIRATION=31536000`,
  `AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY=false`,
  `API_PORT=4130`,
  `API_PREFIX=/api`,
  `API_VERSION=/v2`,
  `API_RELEASE=test-release`,
  `COOKIE_DOMAIN=localhost`,
  `API_ALLOWED_CORS_ORIGINS=http://localhost:4132`,
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
  `APP_WEB_PROTOCOL=http`,
  `APP_WEB_DOMAIN=localhost`,
  `MANAGEMENT_WEB_PROTOCOL=http`,
  `MANAGEMENT_WEB_DOMAIN=localhost`,
] as const;

/** Default Playwright run: no inherited bucket creds; GET /storage reports disabled. */
export function buildManagementApiEnvBucketOffForPlaywright(): string {
  return [...MANAGEMENT_API_ENV_LINES_COMMON, `BUCKET_PROVIDER=`].join(' ');
}

/**
 * Minimal valid `aws-s3` bucket env so `isBucketStorageEnabled()` is true for storage UI E2E.
 * List/detail traffic is mocked in-browser; no real S3 is required.
 */
export function buildManagementApiEnvFakeAwsForPlaywright(): string {
  return [
    ...MANAGEMENT_API_ENV_LINES_COMMON,
    `BUCKET_PROVIDER=aws-s3`,
    `BUCKET_ACCESS_KEY=test-e2e-access-key`,
    `BUCKET_SECRET_KEY=test-e2e-secret-key`,
    `BUCKET_REGION=us-east-1`,
    `BUCKET_NAME=test-e2e-bucket`,
    `BUCKET_CDN_BASE_URL=https://cdn.example.test`,
  ].join(' ');
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
  ].join(' ');
}

export const MANAGEMENT_WEB_ENV_FOR_PLAYWRIGHT = [
  `PORT=4132`,
  `RUNTIME_CONFIG_URL=http://localhost:4131`,
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
].join(' ');
