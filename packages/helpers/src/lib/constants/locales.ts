/**
 * Supported locales across all Podverse projects.
 * These locales must be kept in sync with translation files and i18n configurations.
 */
export const SUPPORTED_LOCALES: string[] = ['en-US', 'es', 'fr', 'el-GR'];

/**
 * Default locale used as fallback when no locale is specified.
 */
export const DEFAULT_LOCALE = 'en-US' as const;
