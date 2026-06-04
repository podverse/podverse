import { isAllowedCustomThemesUrl } from '@podverse/helpers-config';

import type { RemoteThemeDefinition } from './customThemes';
import { buildCustomThemesCssText, parseRemoteThemePack } from './customThemes';

export type RuntimeConfigWithCustomThemes = {
  env: {
    NEXT_PUBLIC_CUSTOM_THEMES_URL?: string;
  };
  customThemes?: RemoteThemeDefinition[];
};

const CUSTOM_THEMES_FETCH_TIMEOUT_MS = 3000;

const customThemesByUrl = new Map<string, Promise<RemoteThemeDefinition[]>>();

export function getConfiguredCustomThemesUrl(
  runtimeConfig: RuntimeConfigWithCustomThemes
): string | undefined {
  const rawUrl = runtimeConfig.env.NEXT_PUBLIC_CUSTOM_THEMES_URL;
  if (rawUrl === undefined || rawUrl.trim() === '') {
    return undefined;
  }
  return rawUrl.trim();
}

export function isCustomThemesHydrated(runtimeConfig: RuntimeConfigWithCustomThemes): boolean {
  const customThemesUrl = getConfiguredCustomThemesUrl(runtimeConfig);
  if (customThemesUrl === undefined) {
    return true;
  }
  return runtimeConfig.customThemes !== undefined;
}

function formatCustomThemesLoadError(url: string, detail: string): string {
  return `[Theme Config] Failed to load custom themes from NEXT_PUBLIC_CUSTOM_THEMES_URL=${url}: ${detail}`;
}

async function fetchCustomThemesFromUrl(url: string): Promise<RemoteThemeDefinition[]> {
  let response: Response;
  try {
    response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(CUSTOM_THEMES_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(formatCustomThemesLoadError(url, message), { cause: error });
  }

  if (!response.ok) {
    throw new Error(formatCustomThemesLoadError(url, `HTTP ${response.status}`));
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    throw new Error(formatCustomThemesLoadError(url, message), { cause: error });
  }

  const parsedPack = parseRemoteThemePack(data);
  if (parsedPack === undefined) {
    throw new Error(
      formatCustomThemesLoadError(url, 'invalid remote theme pack (version/themes schema)')
    );
  }

  return parsedPack.themes;
}

function getCustomThemesForUrl(url: string): Promise<RemoteThemeDefinition[]> {
  const existingPromise = customThemesByUrl.get(url);
  if (existingPromise !== undefined) {
    return existingPromise;
  }
  const fetchPromise = fetchCustomThemesFromUrl(url);
  customThemesByUrl.set(url, fetchPromise);
  return fetchPromise;
}

/**
 * When NEXT_PUBLIC_CUSTOM_THEMES_URL is set, fetches the pack once per process (cached by URL)
 * and attaches customThemes. Any load/validation failure throws so startup can fail fast.
 */
export async function enrichRuntimeConfigWithCustomThemes<T extends RuntimeConfigWithCustomThemes>(
  runtimeConfig: T
): Promise<RuntimeConfigWithCustomThemes & T> {
  if (isCustomThemesHydrated(runtimeConfig)) {
    return runtimeConfig;
  }

  const customThemesUrl = getConfiguredCustomThemesUrl(runtimeConfig);
  if (customThemesUrl === undefined) {
    return runtimeConfig;
  }

  if (!isAllowedCustomThemesUrl(customThemesUrl)) {
    throw new Error(
      `[Theme Config] Invalid NEXT_PUBLIC_CUSTOM_THEMES_URL=${customThemesUrl}. Must be https:// or local http://localhost/127.0.0.1`
    );
  }

  const customThemes = await getCustomThemesForUrl(customThemesUrl);
  return {
    ...runtimeConfig,
    customThemes,
  };
}

export function getCustomThemeCssTextForRuntimeConfig(
  customThemes: readonly RemoteThemeDefinition[] | undefined
): string {
  return buildCustomThemesCssText(customThemes ?? []);
}
