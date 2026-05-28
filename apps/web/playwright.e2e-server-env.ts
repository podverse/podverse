/**
 * Build env prefix strings for Podverse web E2E Playwright config.
 * API env: @podverse/helpers-config `buildPodverseApiTestEnv({ profile: 'apiWebE2e' })`.
 * Web E2E ports: API 4030, sidecar 4031, web 4032.
 */

import {
  buildPodverseApiTestEnv,
  PODVERSE_SKIP_DOTENV_ENV,
  PODVERSE_STARTUP_VALIDATION_SILENT_ENV,
  PODVERSE_WEB_E2E_OBSERVABILITY_ENV,
  toShellEnvPrefix,
} from '@podverse/helpers-config';

export type E2eWebSidecarEnvOptions = {
  cloudflareWebAnalyticsEnabled?: boolean;
};

export function buildE2eWebApiEnvPrefix(): string {
  return toShellEnvPrefix({
    ...buildPodverseApiTestEnv({ profile: 'apiWebE2e' }),
    ...PODVERSE_SKIP_DOTENV_ENV,
  });
}

/**
 * NEXT_PUBLIC_* env vars shared by sidecar and web app build.
 * Sidecar serves these via /runtime-config; next build inlines them.
 */
const WEB_E2E_NEXT_PUBLIC_ENV: Record<string, string> = {
  NEXT_PUBLIC_SSR_API_PROTOCOL: 'http',
  NEXT_PUBLIC_SSR_API_HOST: 'localhost',
  NEXT_PUBLIC_SSR_API_PORT: '4030',
  NEXT_PUBLIC_API_PROTOCOL: 'http',
  NEXT_PUBLIC_API_HOST: 'localhost',
  NEXT_PUBLIC_API_PORT: '4030',
  NEXT_PUBLIC_API_PREFIX: '/api',
  NEXT_PUBLIC_API_VERSION: '/v2',
  NEXT_PUBLIC_WEB_PROTOCOL: 'http',
  NEXT_PUBLIC_WEB_DOMAIN: 'localhost:4032',
  NEXT_PUBLIC_BRAND_NAME: 'PodverseE2E',
  NEXT_PUBLIC_CONTACT_EMAIL: 'contact-e2e@example.com',
  NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES: 'all-available',
  NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE: 'en-US',
  NEXT_PUBLIC_SUPPORTED_THEMES: 'all-available',
  NEXT_PUBLIC_DEFAULT_THEME: 'dark',
  NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE: 'admin_only_email',
  NEXT_PUBLIC_SERVER_ENV: 'local',
  NEXT_PUBLIC_IMAGE_PROXY_ENABLED: 'false',
  NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED: 'false',
  NEXT_PUBLIC_PROXY_RESPONSE_CACHE_MAX_AGE_SECONDS: '86400',
};

const WEB_E2E_NEXT_PUBLIC_ENV_PREFIX = toShellEnvPrefix(WEB_E2E_NEXT_PUBLIC_ENV);

const WEB_E2E_INTEGRATIONS_ENV_DISABLED = [
  `CLOUDFLARE_WEB_ANALYTICS_ENABLED=false`,
  `CLOUDFLARE_WEB_ANALYTICS_TOKEN=`,
].join(' ');

const WEB_E2E_INTEGRATIONS_ENV_ENABLED = [
  `CLOUDFLARE_WEB_ANALYTICS_ENABLED=true`,
  `CLOUDFLARE_WEB_ANALYTICS_TOKEN=e2e-test-cloudflare-token`,
].join(' ');

/**
 * Env prefix for the web sidecar in E2E mode.
 */
export function buildE2eWebSidecarEnvPrefix(options?: E2eWebSidecarEnvOptions): string {
  const integrationsEnv =
    options?.cloudflareWebAnalyticsEnabled === true
      ? WEB_E2E_INTEGRATIONS_ENV_ENABLED
      : WEB_E2E_INTEGRATIONS_ENV_DISABLED;
  return [
    `PORT=4031`,
    `API_URL=http://localhost:4030`,
    integrationsEnv,
    WEB_E2E_NEXT_PUBLIC_ENV_PREFIX,
    toShellEnvPrefix(PODVERSE_STARTUP_VALIDATION_SILENT_ENV),
  ].join(' ');
}

/**
 * Env record for the web app build and start in E2E mode (production Next.js build).
 */
export function buildE2eWebAppEnv(): Record<string, string> {
  return {
    NODE_ENV: 'production',
    PORT: '4032',
    RUNTIME_CONFIG_URL: 'http://localhost:4031',
    NODE_OPTIONS: '--disable-warning=DEP0060',
    ...PODVERSE_WEB_E2E_OBSERVABILITY_ENV,
    ...WEB_E2E_NEXT_PUBLIC_ENV,
  };
}

/**
 * Env prefix for the web app build and start in E2E mode.
 */
export function buildE2eWebAppEnvPrefix(): string {
  return toShellEnvPrefix(buildE2eWebAppEnv());
}
