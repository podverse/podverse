// Re-export config types for app-level use
export * from './types';

// Re-export config from context for backwards compatibility
// This creates a proxy that delegates to the context's config
// Apps should use createORMContext() and access config from the returned context
import { getORMConfig } from '@orm/context';

// Create a proxy object that delegates property access to the context's config
// This allows code using `config.defaults.account.settings.locale` to work
export const config = new Proxy({} as ReturnType<typeof getORMConfig>, {
  get(_target, prop) {
    return getORMConfig()[prop as keyof ReturnType<typeof getORMConfig>];
  },
});
