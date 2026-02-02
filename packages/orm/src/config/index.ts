// Re-export config types for app-level use
export * from './types.js';

// Re-export config from context for backwards compatibility
// This creates a proxy that delegates to the context's config
// Apps should use createORMContext() and access config from the returned context
import { getORMConfig } from '@orm/context.js';

// Create a proxy object that delegates property access to the context's config
// This allows code using `config.defaults.account.settings.locale` to work
export const config = new Proxy({} as ReturnType<typeof getORMConfig>, {
  get(_target, prop) {
    return getORMConfig()[prop as keyof ReturnType<typeof getORMConfig>];
  },
});

/**
 * Gets the default locale from config, throwing if not configured.
 * This should never happen in production as the env var is validated at startup.
 */
export const getDefaultLocale = (): string => {
  const locale = config.defaults.account.settings.locale;
  if (!locale) {
    throw new Error('DEFAULT_ACCOUNT_SETTINGS_LOCALE is not configured');
  }
  return locale;
};
