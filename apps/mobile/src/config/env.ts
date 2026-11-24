import { Platform } from 'react-native';

import { DEFAULT_MOBILE_DEEP_LINK_SCHEMES, parseMobileDeepLinkSchemes } from './deepLinkSchemes';

export { getMobileBillingModeFromEnv } from './billingEnv';
export type { MobileBillingMode } from './billingEnv';

export { isAddByRssInsecureCredentialsAllowedFromEnv, isMobileE2eFromEnv } from './e2eEnv';

/**
 * Literal `process.env.EXPO_PUBLIC_*` reads for mobile app settings live in this file,
 * `accountSignupModeEnv.ts`, `billingEnv.ts`, `e2eEnv.ts`, and `perfEnv.ts`. Expo only inlines
 * literal member access — never use dynamic `process.env[name]`.
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
 * the native `scheme` array in `app.config.ts` (both parse the same env via `deepLinkSchemes.js`).
 */
export const getMobileDeepLinkSchemesFromEnv = (): string[] => {
  return parseMobileDeepLinkSchemes(process.env.EXPO_PUBLIC_MOBILE_DEEP_LINK_SCHEMES);
};

/** Same address the web contact page uses when a fork has not set its own. */
const FALLBACK_CONTACT_EMAIL = 'contact@podverse.fm';

/**
 * An address is one mailbox: no spaces, and no characters that would add query parameters
 * to the mailto URL.
 */
const CONTACT_EMAIL_PATTERN = /^[^\s@/?#&]+@[^\s@/?#&]+$/;

/**
 * Contact address for in-app support (the error log and Trial limitations).
 * Forks set `EXPO_PUBLIC_CONTACT_EMAIL`.
 * Unset or invalid uses the Podverse contact address.
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

/**
 * Public web origin for share links and https universal / app links.
 * Null when `EXPO_PUBLIC_MOBILE_WEB_BASE_URL` is unset.
 */
export const getMobilePublicWebBaseUrlFromEnv = (): string | null => {
  const value = trimToNull(process.env.EXPO_PUBLIC_MOBILE_WEB_BASE_URL);
  if (value === null) {
    return null;
  }
  return normalizeBaseUrl(value);
};

const ALBY_AUTHORIZE_URL_DEFAULT = 'https://getalby.com/oauth';
const ALBY_API_BASE_URL_DEFAULT = 'https://api.getalby.com';

export type MobileAlbyConfig = {
  /** Null when this build has no public Alby OAuth client id. */
  clientId: string | null;
  authorizeUrl: string;
  apiBaseUrl: string;
  redirectUri: string;
};

/**
 * An https URL with one trailing slash removed. Any other value is ignored so a bad override
 * cannot replace the public Alby host.
 */
const httpsUrlWithoutTrailingSlash = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') {
      return null;
    }
  } catch {
    return null;
  }
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const redirectScheme = (value: string): string | null => {
  try {
    const parsed = new URL(value);
    if (!parsed.protocol.endsWith(':')) {
      return null;
    }
    const scheme = parsed.protocol.slice(0, -1);
    return scheme.length > 0 ? scheme : null;
  } catch {
    return null;
  }
};

/** Public OAuth client id. Empty and unset are null, so Connect stays hidden. */
export const getAlbyOAuthClientIdFromEnv = (): string | null => {
  return trimToNull(process.env.EXPO_PUBLIC_ALBY_OAUTH_CLIENT_ID);
};

/** Authorize endpoint. A non-https override is ignored. */
export const getAlbyOAuthAuthorizeUrlFromEnv = (): string => {
  return (
    httpsUrlWithoutTrailingSlash(trimToNull(process.env.EXPO_PUBLIC_ALBY_OAUTH_AUTHORIZE_URL)) ??
    ALBY_AUTHORIZE_URL_DEFAULT
  );
};

/** Alby API origin. A non-https override is ignored. */
export const getAlbyApiBaseUrlFromEnv = (): string => {
  return (
    httpsUrlWithoutTrailingSlash(trimToNull(process.env.EXPO_PUBLIC_ALBY_API_BASE_URL)) ??
    ALBY_API_BASE_URL_DEFAULT
  );
};

/**
 * OAuth redirect for this build. Unset uses the first registered deep-link scheme.
 * A redirect whose scheme is not registered is ignored.
 */
export const getAlbyOAuthRedirectUriFromEnv = (): string => {
  const schemes = getMobileDeepLinkSchemesFromEnv();
  const firstScheme = schemes[0] ?? DEFAULT_MOBILE_DEEP_LINK_SCHEMES[0];
  const fallback = `${firstScheme}://alby/callback`;
  const configured = trimToNull(process.env.EXPO_PUBLIC_ALBY_OAUTH_REDIRECT_URI);
  if (configured === null) {
    return fallback;
  }
  const scheme = redirectScheme(configured);
  if (scheme === null || !schemes.includes(scheme)) {
    return fallback;
  }
  return configured;
};

export const getMobileAlbyConfigFromEnv = (): MobileAlbyConfig => {
  return {
    clientId: getAlbyOAuthClientIdFromEnv(),
    authorizeUrl: getAlbyOAuthAuthorizeUrlFromEnv(),
    apiBaseUrl: getAlbyApiBaseUrlFromEnv(),
    redirectUri: getAlbyOAuthRedirectUriFromEnv(),
  };
};
