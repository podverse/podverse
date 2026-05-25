import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const defaultIntegrations = {
  cloudflare: {
    webAnalytics: {
      enabled: false,
      token: undefined,
    },
  },
};

const clearRuntimeConfigGlobal = () => {
  delete (
    globalThis as {
      __PODVERSE_MANAGEMENT_RUNTIME_CONFIG__?: unknown;
    }
  ).__PODVERSE_MANAGEMENT_RUNTIME_CONFIG__;
};

describe('management-web runtime-config store', () => {
  beforeEach(() => {
    vi.resetModules();
    clearRuntimeConfigGlobal();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    clearRuntimeConfigGlobal();
  });

  it('falls back to process.env when runtime config is not set', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEXT_PUBLIC_API_PROTOCOL', 'https');

    const { getRuntimeConfig } = await import('./runtime-config-store');

    expect(getRuntimeConfig().env.NEXT_PUBLIC_API_PROTOCOL).toBe('https');
    expect(getRuntimeConfig().integrations).toEqual(defaultIntegrations);
  });

  it('returns explicitly set runtime config when available', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEXT_PUBLIC_API_PROTOCOL', 'http');

    const { getRuntimeConfig, setRuntimeConfig } = await import('./runtime-config-store');

    setRuntimeConfig({
      env: {
        NEXT_PUBLIC_API_HOST: 'localhost',
        NEXT_PUBLIC_API_PORT: '3100',
        NEXT_PUBLIC_API_PREFIX: '/api',
        NEXT_PUBLIC_API_PROTOCOL: 'https',
        NEXT_PUBLIC_API_VERSION: '/v2',
        NEXT_PUBLIC_BRAND_APPLE_TOUCH_ICON_URL: undefined,
        NEXT_PUBLIC_BRAND_APP_ICON_192_URL: undefined,
        NEXT_PUBLIC_BRAND_APP_ICON_512_URL: undefined,
        NEXT_PUBLIC_BRAND_BACKGROUND_COLOR: undefined,
        NEXT_PUBLIC_BRAND_DOMAIN: undefined,
        NEXT_PUBLIC_BRAND_FAVICON_ICO_URL: undefined,
        NEXT_PUBLIC_BRAND_FAVICON_PNG_96_URL: undefined,
        NEXT_PUBLIC_BRAND_FAVICON_SVG_URL: undefined,
        NEXT_PUBLIC_BRAND_NAME: 'Podverse Management',
        NEXT_PUBLIC_BRAND_THEME_COLOR: undefined,
        NEXT_PUBLIC_DEFAULT_THEME: 'dark',
        NEXT_PUBLIC_SUPPORTED_THEMES: 'all-available',
        NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE: 'en-US',
        NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES: 'all-available',
        NEXT_PUBLIC_SSR_API_HOST: 'podverse_local_management_api',
        NEXT_PUBLIC_SSR_API_PORT: '3100',
        NEXT_PUBLIC_SSR_API_PROTOCOL: 'http',
      },
      integrations: defaultIntegrations,
    });

    expect(getRuntimeConfig().env.NEXT_PUBLIC_API_PROTOCOL).toBe('https');
  });

  it('preserves integrations from explicitly set runtime config', async () => {
    vi.stubEnv('NODE_ENV', 'test');

    const { getRuntimeConfig, setRuntimeConfig } = await import('./runtime-config-store');

    setRuntimeConfig({
      env: {
        NEXT_PUBLIC_API_HOST: 'localhost',
        NEXT_PUBLIC_API_PORT: '3100',
        NEXT_PUBLIC_API_PREFIX: '/api',
        NEXT_PUBLIC_API_PROTOCOL: 'https',
        NEXT_PUBLIC_API_VERSION: '/v2',
        NEXT_PUBLIC_BRAND_APPLE_TOUCH_ICON_URL: undefined,
        NEXT_PUBLIC_BRAND_APP_ICON_192_URL: undefined,
        NEXT_PUBLIC_BRAND_APP_ICON_512_URL: undefined,
        NEXT_PUBLIC_BRAND_BACKGROUND_COLOR: undefined,
        NEXT_PUBLIC_BRAND_DOMAIN: undefined,
        NEXT_PUBLIC_BRAND_FAVICON_ICO_URL: undefined,
        NEXT_PUBLIC_BRAND_FAVICON_PNG_96_URL: undefined,
        NEXT_PUBLIC_BRAND_FAVICON_SVG_URL: undefined,
        NEXT_PUBLIC_BRAND_NAME: 'Podverse Management',
        NEXT_PUBLIC_BRAND_THEME_COLOR: undefined,
        NEXT_PUBLIC_DEFAULT_THEME: 'dark',
        NEXT_PUBLIC_SUPPORTED_THEMES: 'all-available',
        NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE: 'en-US',
        NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES: 'all-available',
        NEXT_PUBLIC_SSR_API_HOST: 'podverse_local_management_api',
        NEXT_PUBLIC_SSR_API_PORT: '3100',
        NEXT_PUBLIC_SSR_API_PROTOCOL: 'http',
      },
      integrations: {
        cloudflare: {
          webAnalytics: {
            enabled: true,
            token: 'test-token',
          },
        },
      },
    });

    expect(getRuntimeConfig().integrations.cloudflare.webAnalytics).toEqual({
      enabled: true,
      token: 'test-token',
    });
  });

  it('logs process.env fallback once in non-production mode', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_API_PROTOCOL', 'http');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { getRuntimeConfig } = await import('./runtime-config-store');
    getRuntimeConfig();
    getRuntimeConfig();

    expect(logSpy).toHaveBeenCalledTimes(1);
  });
});
