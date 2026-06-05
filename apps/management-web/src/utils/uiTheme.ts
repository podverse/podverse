import type { RemoteThemeDefinition } from '@podverse/ui';
import { ALL_POSSIBLE_THEMES } from '@podverse/ui';

import { getConfig } from '../config';

export type UITheme = string;

const ALL_AVAILABLE_VALUE = 'all-available';

/**
 * Get the list of valid themes from config, or all themes if config is blank
 */
export function getValidThemes(): UITheme[] {
  const customThemes = getCustomThemes().map((theme) => theme.id);
  const config = getConfig();
  const validThemesConfig = config.public.theme.valid?.trim();

  if (!validThemesConfig) {
    return [...new Set<string>([...ALL_POSSIBLE_THEMES, ...customThemes])];
  }

  if (validThemesConfig.toLowerCase() === ALL_AVAILABLE_VALUE) {
    return [...new Set<string>([...ALL_POSSIBLE_THEMES, ...customThemes])];
  }

  const themes = validThemesConfig
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const validThemes: string[] = [];
  themes.forEach((theme) => {
    const match = ALL_POSSIBLE_THEMES.find((t) => t === theme);
    if (match !== undefined) {
      validThemes.push(match);
    } else if (typeof window !== 'undefined') {
      console.warn(
        `[Theme Config] Invalid theme "${theme}" in NEXT_PUBLIC_SUPPORTED_THEMES. Valid themes are: ${ALL_POSSIBLE_THEMES.join(', ')}`
      );
    }
  });

  if (validThemes.length === 0) {
    if (typeof window !== 'undefined') {
      console.warn(
        `[Theme Config] No valid themes found in NEXT_PUBLIC_SUPPORTED_THEMES. Using all themes: ${ALL_POSSIBLE_THEMES.join(', ')}`
      );
    }
    return [...new Set<string>([...ALL_POSSIBLE_THEMES, ...customThemes])];
  }

  return [...new Set<string>([...validThemes, ...customThemes])];
}

export function getCustomThemes(): RemoteThemeDefinition[] {
  const config = getConfig();
  return config.public.theme.customThemes ?? [];
}

export function getCustomThemeById(themeId: string): RemoteThemeDefinition | undefined {
  return getCustomThemes().find((theme) => theme.id === themeId);
}

/**
 * Get the default theme from config, or "dark" if blank, or first valid theme if dark is not valid
 */
export function getDefaultTheme(): UITheme {
  const customThemes = getCustomThemes();
  const firstCustomTheme = customThemes.at(0);
  if (firstCustomTheme !== undefined) {
    return firstCustomTheme.id;
  }

  const config = getConfig();
  const defaultThemeConfig = config.public.theme.default?.trim().toLowerCase();
  const validThemes = getValidThemes();

  if (!defaultThemeConfig) {
    if (validThemes.includes('dark')) {
      return 'dark';
    }
    return validThemes[0] || 'dark';
  }

  const defaultThemeMatch = ALL_POSSIBLE_THEMES.find(
    (t) => t === defaultThemeConfig
  )?.toLowerCase();
  if (defaultThemeMatch === undefined) {
    if (typeof window !== 'undefined') {
      console.warn(
        `[Theme Config] Invalid default theme "${defaultThemeConfig}" in NEXT_PUBLIC_DEFAULT_THEME. Valid themes are: ${ALL_POSSIBLE_THEMES.join(', ')}. Using fallback.`
      );
    }
    if (validThemes.includes('dark')) {
      return 'dark';
    }
    return validThemes[0] || 'dark';
  }

  if (!validThemes.includes(defaultThemeMatch)) {
    if (typeof window !== 'undefined') {
      console.warn(
        '[Theme Config] Default theme is not in the list of valid themes. Using fallback.'
      );
    }
    if (validThemes.includes('dark')) {
      return 'dark';
    }
    return validThemes[0] || 'dark';
  }

  return defaultThemeMatch;
}

export function toUITheme(value?: string | null): UITheme {
  const validUIThemes = getValidThemes();
  const defaultTheme = getDefaultTheme();

  if (!value) {
    return defaultTheme;
  }

  const themeLower = value.toLowerCase();
  const match = validUIThemes.find((t) => t === themeLower);
  return match !== undefined ? match : defaultTheme;
}

export const UI_THEME_COOKIE = 'mgmt_ui_theme';
