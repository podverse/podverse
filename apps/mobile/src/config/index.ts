import {
  getMobileDeepLinkSchemesFromEnv,
  getMobilePublicWebBaseUrlFromEnv,
  getMobilePushProviderFromEnv,
  getMobileUnifiedPushAuthKeyFromEnv,
  getMobileUnifiedPushEndpointFromEnv,
  isMobileE2eFromEnv,
  isMobileV4vEnabledFromEnv,
  selectMobileApiBaseUrl,
} from './env';
import type { MobileApiConnection } from './parseApiConnection';
import { parseMobileApiConnection } from './parseApiConnection';
import { assertMobileApiEnvOrWarn } from './validateMobileEnv';

export type { MobileApiConnection } from './parseApiConnection';
export type { MobileApiEnvVarName } from './env';
export { validateMobileApiEnv, assertMobileApiEnvOrWarn } from './validateMobileEnv';

export type MobileConfig = {
  /** Parsed API connection, or null when unset (UI-only) or invalid. */
  api: MobileApiConnection | null;
  /** Custom URL schemes registered for deep links (e.g. `['podverse-next', 'podverse']`). */
  deepLinkSchemes: string[];
  isE2e: boolean;
  pushProvider: 'fcm' | 'none' | 'unifiedpush';
  unifiedPushAuthKey: string | null;
  unifiedPushEndpoint: string | null;
  /** Value-for-value boost entry enabled (Track 11.14 stub; hidden by default). */
  isV4vEnabled: boolean;
  webBaseUrl: string;
};

/**
 * Typed mobile app config. Sole consumer-facing entry for env-derived settings.
 * Outside `src/config/`, import `getMobileConfig()` — do not read `process.env.EXPO_PUBLIC_*`.
 */
export const getMobileConfig = (): MobileConfig => {
  const selectedBaseUrl = selectMobileApiBaseUrl();
  const deepLinkSchemes = getMobileDeepLinkSchemesFromEnv();
  const isE2e = isMobileE2eFromEnv();
  const pushProvider = getMobilePushProviderFromEnv();
  const unifiedPushEndpoint = getMobileUnifiedPushEndpointFromEnv();
  const unifiedPushAuthKey = getMobileUnifiedPushAuthKeyFromEnv();
  const isV4vEnabled = isMobileV4vEnabledFromEnv();
  const webBaseUrl = getMobilePublicWebBaseUrlFromEnv();

  if (selectedBaseUrl.value === null) {
    return {
      api: null,
      deepLinkSchemes,
      isE2e,
      isV4vEnabled,
      pushProvider,
      unifiedPushAuthKey,
      unifiedPushEndpoint,
      webBaseUrl,
    };
  }

  if (!assertMobileApiEnvOrWarn(selectedBaseUrl.sourceEnvVarName)) {
    return {
      api: null,
      deepLinkSchemes,
      isE2e,
      isV4vEnabled,
      pushProvider,
      unifiedPushAuthKey,
      unifiedPushEndpoint,
      webBaseUrl,
    };
  }

  const api = parseMobileApiConnection(selectedBaseUrl.value);
  return {
    api,
    deepLinkSchemes,
    isE2e,
    isV4vEnabled,
    pushProvider,
    unifiedPushAuthKey,
    unifiedPushEndpoint,
    webBaseUrl,
  };
};
