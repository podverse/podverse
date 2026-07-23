import { isMobileE2eFromEnv, isMobileV4vEnabledFromEnv, selectMobileApiBaseUrl } from './env';
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
  /** Value-for-value boost entry enabled (Track 11.14 stub; hidden by default). */
  isV4vEnabled: boolean;
};

/**
 * Typed mobile app config. Sole consumer-facing entry for env-derived settings.
 * Outside `src/config/`, import `getMobileConfig()` — do not read `process.env.EXPO_PUBLIC_*`.
 */
export const getMobileConfig = (): MobileConfig => {
  const selectedBaseUrl = selectMobileApiBaseUrl();
  const isE2e = isMobileE2eFromEnv();
  const isV4vEnabled = isMobileV4vEnabledFromEnv();

  if (selectedBaseUrl.value === null) {
    return { api: null, isE2e, isV4vEnabled };
  }

  if (!assertMobileApiEnvOrWarn(selectedBaseUrl.sourceEnvVarName)) {
    return { api: null, isE2e, isV4vEnabled };
  }

  const api = parseMobileApiConnection(selectedBaseUrl.value);
  return { api, isE2e, isV4vEnabled };
};
