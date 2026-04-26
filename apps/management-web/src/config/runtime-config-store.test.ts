import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
        NEXT_PUBLIC_BRAND_DOMAIN: undefined,
        NEXT_PUBLIC_BRAND_NAME: 'Podverse Management',
        NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE: 'en-US',
        NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES: 'all-available',
        NEXT_PUBLIC_SSR_API_HOST: 'podverse_local_management_api',
        NEXT_PUBLIC_SSR_API_PORT: '3100',
        NEXT_PUBLIC_SSR_API_PROTOCOL: 'http',
      },
    });

    expect(getRuntimeConfig().env.NEXT_PUBLIC_API_PROTOCOL).toBe('https');
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
