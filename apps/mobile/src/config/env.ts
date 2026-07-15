import { Platform } from 'react-native';

/**
 * Sole module with literal `process.env.EXPO_PUBLIC_*` reads for mobile app settings.
 * Expo only inlines literal member access — never use dynamic `process.env[name]`.
 */

export type MobileApiEnvVarName =
  | 'EXPO_PUBLIC_MOBILE_API_BASE_URL'
  | 'EXPO_PUBLIC_MOBILE_API_BASE_URL_ANDROID'
  | 'EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS';

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

export const isMobileE2eFromEnv = (): boolean => process.env.EXPO_PUBLIC_MOBILE_E2E === '1';
