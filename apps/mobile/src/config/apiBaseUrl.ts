import { Platform } from 'react-native';

const trimToNull = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/**
 * Mobile API base URL selected by platform for local E2E.
 *
 * Keep this nullable so UI-only flows (hello-world) do not require API wiring.
 */
export const getMobileApiBaseUrl = (): string | null => {
  const shared = trimToNull(process.env.EXPO_PUBLIC_MOBILE_API_BASE_URL);
  if (shared) {
    return shared;
  }

  const byPlatform = Platform.select<string | null>({
    ios: trimToNull(process.env.EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS),
    android: trimToNull(process.env.EXPO_PUBLIC_MOBILE_API_BASE_URL_ANDROID),
    default: null,
  });

  return byPlatform ?? null;
};
