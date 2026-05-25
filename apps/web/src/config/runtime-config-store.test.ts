import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WebRuntimeConfig, WebRuntimeConfigEnvKey } from './runtime-config';
import { webRuntimeConfigEnvKeys } from './runtime-config';

const defaultIntegrations = {
  cloudflare: {
    webAnalytics: {
      enabled: false,
      token: undefined,
    },
  },
};

const buildTestWebRuntimeEnv = (
  overrides: Partial<WebRuntimeConfig['env']> = {}
): WebRuntimeConfig['env'] => {
  const allKeys = [
    ...webRuntimeConfigEnvKeys.required,
    ...webRuntimeConfigEnvKeys.optional,
  ] as WebRuntimeConfigEnvKey[];
  const base = Object.fromEntries(
    allKeys.map((key) => [key, undefined])
  ) as WebRuntimeConfig['env'];
  return {
    ...base,
    NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE: 'admin_only_email',
    NEXT_PUBLIC_API_HOST: 'localhost',
    NEXT_PUBLIC_API_PREFIX: '/api',
    NEXT_PUBLIC_API_PROTOCOL: 'http',
    NEXT_PUBLIC_API_VERSION: '/v2',
    NEXT_PUBLIC_DEFAULT_THEME: 'dark',
    NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE: 'en-US',
    NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES: 'all-available',
    NEXT_PUBLIC_SERVER_ENV: 'local',
    NEXT_PUBLIC_SSR_API_HOST: 'localhost',
    NEXT_PUBLIC_SSR_API_PROTOCOL: 'http',
    NEXT_PUBLIC_SUPPORTED_THEMES: 'all-available',
    NEXT_PUBLIC_WEB_DOMAIN: 'localhost:3002',
    NEXT_PUBLIC_WEB_PROTOCOL: 'http',
    ...overrides,
  };
};

const clearRuntimeConfigGlobal = () => {
  delete (
    globalThis as {
      __PODVERSE_RUNTIME_CONFIG__?: unknown;
    }
  ).__PODVERSE_RUNTIME_CONFIG__;
};

describe('web runtime-config store', () => {
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

  it('reads Cloudflare integration from process.env when runtime config is not set', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('CLOUDFLARE_WEB_ANALYTICS_ENABLED', 'true');
    vi.stubEnv('CLOUDFLARE_WEB_ANALYTICS_TOKEN', 'env-token');

    const { getRuntimeConfig } = await import('./runtime-config-store');

    expect(getRuntimeConfig().integrations.cloudflare.webAnalytics).toEqual({
      enabled: true,
      token: 'env-token',
    });
  });

  it('returns explicitly set runtime config when available', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEXT_PUBLIC_API_PROTOCOL', 'http');

    const { getRuntimeConfig, setRuntimeConfig } = await import('./runtime-config-store');

    setRuntimeConfig({
      env: buildTestWebRuntimeEnv({ NEXT_PUBLIC_API_PROTOCOL: 'https' }),
      integrations: defaultIntegrations,
    });

    expect(getRuntimeConfig().env.NEXT_PUBLIC_API_PROTOCOL).toBe('https');
  });

  it('preserves integrations from explicitly set runtime config', async () => {
    vi.stubEnv('NODE_ENV', 'test');

    const { getRuntimeConfig, setRuntimeConfig } = await import('./runtime-config-store');

    setRuntimeConfig({
      env: buildTestWebRuntimeEnv(),
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
