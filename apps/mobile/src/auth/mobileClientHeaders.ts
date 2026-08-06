/**
 * Header sent on every mobile API request so the server can log/slice by client version and platform
 * (master plan Track 22.6). Long-lived shipped clients make this the source of truth for the
 * add-only API discipline (22.5) and post-release monitoring (22.10).
 *
 * Pure module (no expo/react-native imports) so it stays in the node unit-test graph; the RN-coupled
 * version/platform resolution lives at the call site (`mobileApi.ts`).
 */
export const MOBILE_CLIENT_VERSION_HEADER = 'X-Podverse-Client-Version';
export const MOBILE_CLIENT_PLATFORM_HEADER = 'X-Podverse-Client-Platform';

/** Fallback used when the Expo config exposes no version. */
export const MOBILE_CLIENT_VERSION_FALLBACK = 'unknown';

/** Builds the client-identity headers from an already-resolved version + platform. */
export const buildMobileClientHeaders = (
  version: string | null | undefined,
  platform: string
): Record<string, string> => ({
  [MOBILE_CLIENT_VERSION_HEADER]:
    version !== null && version !== undefined && version !== ''
      ? version
      : MOBILE_CLIENT_VERSION_FALLBACK,
  [MOBILE_CLIENT_PLATFORM_HEADER]: platform,
});
