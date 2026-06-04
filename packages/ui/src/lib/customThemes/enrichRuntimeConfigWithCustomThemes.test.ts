import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RuntimeConfigWithCustomThemes } from './enrichRuntimeConfigWithCustomThemes';
import {
  enrichRuntimeConfigWithCustomThemes,
  getConfiguredCustomThemesUrl,
  isCustomThemesHydrated,
} from './enrichRuntimeConfigWithCustomThemes';

const validPack = {
  version: '1',
  themes: [
    {
      id: 'brand-dark',
      cssVariables: {
        '--pv-color-brand-primary': '#123456',
      },
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('enrichRuntimeConfigWithCustomThemes', () => {
  it('skips fetch when custom themes URL is unset', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const runtimeConfig = { env: {} };
    const enriched = await enrichRuntimeConfigWithCustomThemes(runtimeConfig);

    expect(enriched).toEqual(runtimeConfig);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(isCustomThemesHydrated(enriched)).toBe(true);
  });

  it('throws when custom themes URL is configured but fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => validPack,
      })
    );

    await expect(
      enrichRuntimeConfigWithCustomThemes({
        env: { NEXT_PUBLIC_CUSTOM_THEMES_URL: 'https://fail.example.com/themes.json' },
      })
    ).rejects.toThrow('HTTP 503');
  });

  it('loads and caches custom themes when URL is configured', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => validPack,
      })
    );

    const base: RuntimeConfigWithCustomThemes = {
      env: { NEXT_PUBLIC_CUSTOM_THEMES_URL: 'https://ok.example.com/themes.json' },
    };

    const first = await enrichRuntimeConfigWithCustomThemes(base);
    expect(first.customThemes).toHaveLength(1);
    expect(getConfiguredCustomThemesUrl(first)).toBe('https://ok.example.com/themes.json');

    const alreadyHydrated = { ...base, customThemes: first.customThemes };
    const second = await enrichRuntimeConfigWithCustomThemes(alreadyHydrated);
    expect(second).toBe(alreadyHydrated);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
