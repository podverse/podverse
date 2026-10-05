import { Platform } from 'react-native';

import { parseMobileDeepLinkSchemes } from './deepLinkSchemes';

export { getMobileBillingModeFromEnv } from './billingEnv';
export type { MobileBillingMode } from './billingEnv';

export { isAddByRssInsecureCredentialsAllowedFromEnv, isMobileE2eFromEnv } from './e2eEnv';

/**
 * Literal `process.env.EXPO_PUBLIC_*` reads for mobile app settings live in this file,
 * `billingEnv.ts`, `e2eEnv.ts`, and `perfEnv.ts`. Expo only inlines literal member access — never use dynamic
 * `process.env[name]`.
 */

export type MobileApiEnvVarName =
  | 'EXPO_PUBLIC_MOBILE_API_BASE_URL'
  | 'EXPO_PUBLIC_MOBILE_API_BASE_URL_ANDROID'
  | 'EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS';

export type MobilePushProvider = 'fcm' | 'none' | 'unifiedpush';

export type SelectedMobileApiBaseUrl = {
  sourceEnvVarName: MobileApiEnvVarName;
  value: string | null;
};

const trimToNull = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/**
 * Shared base URL wins; otherwise platform-specific iOS/Android env.
 */
export const selectMobileApiBaseUrl = (): SelectedMobileApiBaseUrl => {
  const shared = trimToNull(process.env.EXPO_PUBLIC_MOBILE_API_BASE_URL);
  if (shared !== null) {
    return {
      sourceEnvVarName: 'EXPO_PUBLIC_MOBILE_API_BASE_URL',
      value: shared,
    };
  }

  if (Platform.OS === 'ios') {
    return {
      sourceEnvVarName: 'EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS',
      value: trimToNull(process.env.EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS),
    };
  }

  return {
    sourceEnvVarName: 'EXPO_PUBLIC_MOBILE_API_BASE_URL_ANDROID',
    value: trimToNull(process.env.EXPO_PUBLIC_MOBILE_API_BASE_URL_ANDROID),
  };
};

/**
 * Value-for-value (boost) entry is opt-in and hidden by default. Store-restricted builds (e.g.
 * F-Droid / Google Play where bitcoin UX is not permitted) simply never set the flag, so the entry
 * stays hidden unless a build explicitly enables it.
 */
export const isMobileV4vEnabledFromEnv = (): boolean =>
  process.env.EXPO_PUBLIC_MOBILE_V4V_ENABLED === '1';

export const getMobilePushProviderFromEnv = (): MobilePushProvider => {
  const rawProvider = trimToNull(process.env.EXPO_PUBLIC_MOBILE_PUSH_PROVIDER);
  if (rawProvider === 'unifiedpush') {
    return 'unifiedpush';
  }
  if (rawProvider === 'none') {
    return 'none';
  }
  return 'fcm';
};

export const getMobileUnifiedPushEndpointFromEnv = (): string | null => {
  return trimToNull(process.env.EXPO_PUBLIC_MOBILE_UNIFIEDPUSH_ENDPOINT);
};

export const getMobileUnifiedPushAuthKeyFromEnv = (): string | null => {
  return trimToNull(process.env.EXPO_PUBLIC_MOBILE_UNIFIEDPUSH_AUTH_KEY);
};

/**
 * Custom URL schemes this build registers / accepts as deep-link prefixes. Defaults to the Podverse
 * beta + legacy pair; forks override via `EXPO_PUBLIC_MOBILE_DEEP_LINK_SCHEMES`. Keep in sync with
 * the native `scheme` array in `app.config.ts` (both parse the same env via `deepLinkSchemes.ts`).
 */
export const getMobileDeepLinkSchemesFromEnv = (): string[] => {
  return parseMobileDeepLinkSchemes(process.env.EXPO_PUBLIC_MOBILE_DEEP_LINK_SCHEMES);
};

const FALLBACK_PUBLIC_WEB_BASE_URL = 'https://podverse.fm';

/** Same address the web contact page uses when a fork has not set its own. */
const FALLBACK_CONTACT_EMAIL = 'contact@podverse.fm';

/**
 * An address is one mailbox: no spaces, and no characters that would add query parameters
 * to the mailto URL.
 */
const CONTACT_EMAIL_PATTERN = /^[^\s@/?#&]+@[^\s@/?#&]+$/;

/**
 * Address for the error-log email action. Forks set `EXPO_PUBLIC_CONTACT_EMAIL`.
 * Unset or invalid uses the Podverse contact address, same idea as the public web base URL.
 */
export const getMobileContactEmailFromEnv = (): string => {
  const configured = trimToNull(process.env.EXPO_PUBLIC_CONTACT_EMAIL);
  if (configured !== null && CONTACT_EMAIL_PATTERN.test(configured)) {
    return configured;
  }
  return FALLBACK_CONTACT_EMAIL;
};

const normalizeBaseUrl = (value: string): string => {
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

export const getMobilePublicWebBaseUrlFromEnv = (): string => {
  const direct = trimToNull(process.env.EXPO_PUBLIC_MOBILE_WEB_BASE_URL);
  if (direct !== null) {
    return normalizeBaseUrl(direct);
  }

  const legacy = trimToNull(process.env.WEB_BASE_URL);
  if (legacy !== null) {
    return normalizeBaseUrl(legacy);
  }

  return FALLBACK_PUBLIC_WEB_BASE_URL;
};
