export const SETTINGS_LOCALE_OPTIONS = ['en-US', 'es', 'fr', 'el-GR'] as const;

export type SettingsLocaleOption = (typeof SETTINGS_LOCALE_OPTIONS)[number];
