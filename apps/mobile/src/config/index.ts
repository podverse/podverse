import { isMobileE2eFromEnv, selectMobileApiBaseUrl } from './env';
import type { MobileApiConnection } from './parseApiConnection';
import { parseMobileApiConnection } from './parseApiConnection';
import { assertMobileApiEnvOrWarn } from './validateMobileEnv';

export type { MobileApiConnection } from './parseApiConnection';
export type { MobileApiEnvVarName } from './env';
export { validateMobileApiEnv, assertMobileApiEnvOrWarn } from './validateMobileEnv';

export type MobileConfig = {
  /** Parsed API connection, or null when unset (UI-only) or invalid. */
  api: MobileApiConnection | null;
  isE2e: boolean;
};

/**
 * Typed mobile app config. Sole consumer-facing entry for env-derived settings.
 * Outside `src/config/`, import `getMobileConfig()` — do not read `process.env.EXPO_PUBLIC_*`.
 */
export const getMobileConfig = (): MobileConfig => {
  const selectedBaseUrl = selectMobileApiBaseUrl();
  const isE2e = isMobileE2eFromEnv();

  if (selectedBaseUrl.value === null) {
    return { api: null, isE2e };
  }

  if (!assertMobileApiEnvOrWarn(selectedBaseUrl.sourceEnvVarName)) {
    return { api: null, isE2e };
  }

  const api = parseMobileApiConnection(selectedBaseUrl.value);
  return { api, isE2e };
};
