/**
 * Pure deep-link scheme + prefix helpers shared by the React Native bundle (config / navigation) and
 * the Expo config (`app.config.ts` native scheme registration) so the two never drift. Intentionally
 * free of React Native / Expo imports so it stays evaluable in the Node-only Vitest env and by the
 * Expo config loader. See the `mobile-deep-links-and-prod-cutover` rule.
 */

import { APP_ROUTES } from '@podverse/helpers';

/**
 * Custom URL schemes the app registers, most-specific first. `podverse-next` is the beta scheme;
 * `podverse` is kept as a legacy alias so an eventual in-place v4 → v5 upgrade (same bundle id /
 * package) still resolves existing `podverse://` links out in the wild. Forks / white-labels override
 * the whole list via `EXPO_PUBLIC_MOBILE_DEEP_LINK_SCHEMES` (comma- or space-delimited).
 */
export const DEFAULT_MOBILE_DEEP_LINK_SCHEMES = ['podverse-next', 'podverse'];

const stripSchemeSuffix = (value: string): string => {
  return value.replace(/:\/\/$/, '').replace(/:$/, '');
};

/**
 * Parse a comma/space-delimited scheme list env value into bare scheme names (no `://`). Falls back
 * to {@link DEFAULT_MOBILE_DEEP_LINK_SCHEMES} when unset or empty so builds always register at least
 * the app's own scheme.
 */
export const parseMobileDeepLinkSchemes = (raw: string | undefined): string[] => {
  const parsed = (raw ?? '')
    .split(/[\s,]+/)
    .map((entry) => stripSchemeSuffix(entry.trim()))
    .filter((entry) => entry.length > 0);
  return parsed.length > 0 ? parsed : [...DEFAULT_MOBILE_DEEP_LINK_SCHEMES];
};

const normalizeBaseUrl = (value: string): string => {
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

/**
 * Build the React Navigation `prefixes` list: each custom scheme as `scheme://`, followed by the
 * public web base URL (for universal / app links). Keeping this pure lets both the RN linking config
 * and unit tests reuse the exact same logic that native scheme registration is derived from.
 */
export const buildMobileLinkPrefixes = (schemes: string[], webBaseUrl: string): string[] => {
  const schemePrefixes = schemes.map((scheme) => `${scheme}://`);
  return [...schemePrefixes, normalizeBaseUrl(webBaseUrl)];
};

/** Path prefixes registered for iOS universal links / Android app links (must match web routes). */
export const MOBILE_UNIVERSAL_LINK_PATH_PREFIXES = [
  `${APP_ROUTES.PODCAST}/`,
  `${APP_ROUTES.EPISODE}/`,
  `${APP_ROUTES.PLAYLIST}/`,
  `${APP_ROUTES.CLIP}/`,
  `${APP_ROUTES.PROFILE}/`,
] as const;
