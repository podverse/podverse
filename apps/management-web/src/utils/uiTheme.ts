export type UITheme = 'dark' | 'light' | 'dracula' | 'violet';

const ALL_THEMES: UITheme[] = ['dark', 'light', 'dracula', 'violet'];

const DEFAULT_THEME: UITheme = 'dark';

export function toUITheme(value?: string | null): UITheme {
  if (!value) return DEFAULT_THEME;
  const t = value.toLowerCase() as UITheme;
  return ALL_THEMES.includes(t) ? t : DEFAULT_THEME;
}

export const UI_THEME_COOKIE = 'mgmt_ui_theme';

export function getValidThemes(): readonly UITheme[] {
  return ALL_THEMES;
}
