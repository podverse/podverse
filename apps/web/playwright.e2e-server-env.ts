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

export type E2eCustomThemesProfile = 'native' | 'remote' | 'combo';

export const E2E_CUSTOM_THEMES_MINIMAL_URL =
  'http://localhost:2111/themes/custom-themes.minimal.json';
export const E2E_CUSTOM_THEMES_MULTI_URL = 'http://localhost:2111/themes/custom-themes.multi.json';

export type E2eWebSidecarEnvOptions = {
  cloudflareWebAnalyticsEnabled?: boolean;
  cookieConsentBannerEnabled?: boolean;
  userSignupEmail?: boolean;
  customThemesProfile?: E2eCustomThemesProfile;
};

/** Matches `TERMS_OF_SERVICE_VERSION` / `NEXT_PUBLIC_TERMS_OF_SERVICE_VERSION` in E2E env. */
export const E2E_TERMS_OF_SERVICE_VERSION = '2026-01-01';

const WEB_E2E_NEXT_PUBLIC_ENV_BASE: Record<string, string> = {
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
  NEXT_PUBLIC_LEGAL_NAME: 'PodverseE2E Legal',
  NEXT_PUBLIC_TERMS_OF_SERVICE_VERSION: E2E_TERMS_OF_SERVICE_VERSION,
  NEXT_PUBLIC_STATS_TRACK_EVENT_RETENTION_DAYS: '30',
  NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES: 'all-available',
  NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE: 'en-US',
  NEXT_PUBLIC_SUPPORTED_THEMES: 'all-available',
  NEXT_PUBLIC_DEFAULT_THEME: 'dark',
  NEXT_PUBLIC_SERVER_ENV: 'local',
  NEXT_PUBLIC_IMAGE_PROXY_ENABLED: 'false',
  NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED: 'false',
  NEXT_PUBLIC_PROXY_RESPONSE_CACHE_MAX_AGE_SECONDS: '86400',
};

function buildCustomThemesProfileEnv(
  profile: E2eCustomThemesProfile | undefined
): Record<string, string> {
  if (profile === undefined) {
    return {};
  }
  if (profile === 'native') {
    return {
      NEXT_PUBLIC_CUSTOM_THEMES_URL: '',
      NEXT_PUBLIC_SUPPORTED_THEMES: 'dark,light,dracula',
      NEXT_PUBLIC_DEFAULT_THEME: 'dark',
    };
  }
  if (profile === 'remote') {
    return {
      NEXT_PUBLIC_CUSTOM_THEMES_URL: E2E_CUSTOM_THEMES_MINIMAL_URL,
      NEXT_PUBLIC_SUPPORTED_THEMES: 'dark',
      NEXT_PUBLIC_DEFAULT_THEME: 'dark',
    };
  }
  return {
    NEXT_PUBLIC_CUSTOM_THEMES_URL: E2E_CUSTOM_THEMES_MULTI_URL,
    NEXT_PUBLIC_SUPPORTED_THEMES: 'all-available',
    NEXT_PUBLIC_DEFAULT_THEME: 'dark',
  };
}

function buildE2eWebNextPublicEnv(options?: E2eWebSidecarEnvOptions): Record<string, string> {
  return {
    ...WEB_E2E_NEXT_PUBLIC_ENV_BASE,
    ...buildCustomThemesProfileEnv(options?.customThemesProfile),
    NEXT_PUBLIC_COOKIE_CONSENT_BANNER_ENABLED:
      options?.cookieConsentBannerEnabled === true ? 'true' : '',
    NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE:
      options?.userSignupEmail === true ? 'user_signup_email' : 'admin_only_email',
  };
}

const WEB_E2E_INTEGRATIONS_ENV_DISABLED = [
  `CLOUDFLARE_WEB_ANALYTICS_ENABLED=false`,
  `CLOUDFLARE_WEB_ANALYTICS_TOKEN=`,
].join(' ');

const WEB_E2E_INTEGRATIONS_ENV_ENABLED = [
  `CLOUDFLARE_WEB_ANALYTICS_ENABLED=true`,
  `CLOUDFLARE_WEB_ANALYTICS_TOKEN=e2e-test-cloudflare-token`,
].join(' ');

export function buildE2eWebApiEnvPrefix(options?: E2eWebSidecarEnvOptions): string {
  const apiEnv = {
    ...buildPodverseApiTestEnv({ profile: 'apiWebE2e' }),
    ...(options?.userSignupEmail === true ? { ACCOUNT_SIGNUP_MODE: 'user_signup_email' } : {}),
    ...PODVERSE_SKIP_DOTENV_ENV,
  };
  return toShellEnvPrefix(apiEnv);
}

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
    toShellEnvPrefix(buildE2eWebNextPublicEnv(options)),
    toShellEnvPrefix(PODVERSE_STARTUP_VALIDATION_SILENT_ENV),
  ].join(' ');
}

/**
 * Env record for the web app build and start in E2E mode (production Next.js build).
 */
export function buildE2eWebAppEnv(options?: E2eWebSidecarEnvOptions): Record<string, string> {
  return {
    NODE_ENV: 'production',
    PORT: '4032',
    RUNTIME_CONFIG_URL: 'http://localhost:4031',
    NODE_OPTIONS: '--disable-warning=DEP0060',
    ...PODVERSE_WEB_E2E_OBSERVABILITY_ENV,
    ...buildE2eWebNextPublicEnv(options),
  };
}

/**
 * Env for `next build` in E2E mode (used by build-and-start-next-standalone.sh).
 * Clears custom-themes URL and sidecar URL so static prerender does not no-store fetch.
 */
export function buildE2eWebAppBuildEnv(options?: E2eWebSidecarEnvOptions): Record<string, string> {
  return {
    ...buildE2eWebAppEnv(options),
    NEXT_PUBLIC_CUSTOM_THEMES_URL: '',
    RUNTIME_CONFIG_URL: '',
  };
}

/**
 * Env prefix for the web app `next build` in E2E mode (remote/combo custom-themes lanes).
 */
export function buildE2eWebAppBuildEnvPrefix(options?: E2eWebSidecarEnvOptions): string {
  return toShellEnvPrefix(buildE2eWebAppBuildEnv(options));
}

/**
 * Env prefix for the web app build and start in E2E mode.
 */
export function buildE2eWebAppEnvPrefix(options?: E2eWebSidecarEnvOptions): string {
  return toShellEnvPrefix(buildE2eWebAppEnv(options));
}
