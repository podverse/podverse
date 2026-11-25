import type { AccountSignupMode, ListScreenDefaults } from '@podverse/helpers';
import { parseListScreenDefaults } from '@podverse/helpers/listScreenDefaults';

import { getMobileAccountSignupModeFromEnv } from './accountSignupModeEnv';
import { readCustomApiBaseUrlOverride, readCustomApiWebOrigin } from './customApiEndpoint';
import type { MobileAlbyConfig } from './env';
import {
  getMobileAlbyConfigFromEnv,
  getMobileBillingModeFromEnv,
  getMobileContactEmailFromEnv,
  getMobileDeepLinkSchemesFromEnv,
  getMobileListScreenEnv,
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
export type { MobileBillingMode } from './billingEnv';
export { validateMobileApiEnv, assertMobileApiEnvOrWarn } from './validateMobileEnv';

export type MobileConfig = {
  /** Signup mode. Email-flow controls follow this. */
  accountSignupMode: AccountSignupMode;
  /** Public Alby OAuth client. `clientId` is null when this build has not set one. */
  alby: MobileAlbyConfig;
  /** Parsed API connection, or null when unset (UI-only) or invalid. */
  api: MobileApiConnection | null;
  /** `store` opens a store sheet. `unavailable` is the FOSS build. */
  billingMode: 'store' | 'unavailable';
  /** Address opened by the error-log email action. */
  contactEmail: string;
  /** Saved custom API address, or null while this app uses the built-in API. */
  customApiBaseUrl: string | null;
  /** Website origin that custom API reported, or null when it did not. */
  customApiWebOrigin: string | null;
  /** Custom URL schemes registered for deep links (e.g. `['podverse-next', 'podverse']`). */
  deepLinkSchemes: string[];
  isE2e: boolean;
  pushProvider: 'fcm' | 'none' | 'unifiedpush';
  unifiedPushAuthKey: string | null;
  unifiedPushEndpoint: string | null;
  /** Value-for-value boost entry enabled; hidden by default. */
  isV4vEnabled: boolean;
  /** Opening chip, sort, and view. Null fields keep that screen's own opening choice. */
  listScreens: ListScreenDefaults;
  /**
   * Public web origin baked into this build, or null when it has no web host.
   * Universal links use this field. Share links and in-app browser pages use
   * `resolvePublicWebBaseUrl`.
   */
  webBaseUrl: string | null;
};

/** The build's API address, ignoring any custom override. */
export const getBuiltInMobileApiBaseUrl = (): string | null => selectMobileApiBaseUrl().value;

/**
 * Typed mobile app config. Sole consumer-facing entry for env-derived settings.
 * Outside `src/config/`, import `getMobileConfig()` — do not read `process.env.EXPO_PUBLIC_*`.
 * A saved custom API address replaces `api` until Reset. `webBaseUrl` stays on the build.
 * `customApiBaseUrl` and `customApiWebOrigin` follow the saved override.
 */
const mobileListScreens = (): ListScreenDefaults => {
  const env = getMobileListScreenEnv();
  const parsed = parseListScreenDefaults(env);
  if (parsed.issues.length > 0) {
    const details = parsed.issues.map((issue) => `${issue.field}=${issue.raw}`).join(', ');
    throw new Error(`[mobile-env] Invalid list screen default: ${details}`);
  }
  return parsed.defaults;
};

export const getMobileConfig = (): MobileConfig => {
  const listScreens = mobileListScreens();
  const selectedBaseUrl = selectMobileApiBaseUrl();
  const deepLinkSchemes = getMobileDeepLinkSchemesFromEnv();
  const billingMode = getMobileBillingModeFromEnv();
  const isE2e = isMobileE2eFromEnv();
  const pushProvider = getMobilePushProviderFromEnv();
  const unifiedPushEndpoint = getMobileUnifiedPushEndpointFromEnv();
  const unifiedPushAuthKey = getMobileUnifiedPushAuthKeyFromEnv();
  const isV4vEnabled = isMobileV4vEnabledFromEnv();
  const webBaseUrl = getMobilePublicWebBaseUrlFromEnv();
  const customApiBaseUrl = readCustomApiBaseUrlOverride();
  const customApiWebOrigin = readCustomApiWebOrigin();
  const contactEmail = getMobileContactEmailFromEnv();
  const accountSignupMode = getMobileAccountSignupModeFromEnv();
  const alby = getMobileAlbyConfigFromEnv();

  const shared = {
    accountSignupMode,
    alby,
    billingMode,
    contactEmail,
    customApiBaseUrl,
    customApiWebOrigin,
    deepLinkSchemes,
    isE2e,
    isV4vEnabled,
    listScreens,
    pushProvider,
    unifiedPushAuthKey,
    unifiedPushEndpoint,
    webBaseUrl,
  };

  const override = customApiBaseUrl;
  if (override !== null) {
    const overrideApi = parseMobileApiConnection(override);
    if (overrideApi !== null) {
      return {
        api: overrideApi,
        ...shared,
      };
    }
  }

  if (selectedBaseUrl.value === null) {
    return {
      api: null,
      ...shared,
    };
  }

  if (!assertMobileApiEnvOrWarn(selectedBaseUrl.sourceEnvVarName)) {
    return {
      api: null,
      ...shared,
    };
  }

  return {
    api: parseMobileApiConnection(selectedBaseUrl.value),
    ...shared,
  };
};
