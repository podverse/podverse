import type { ExpoConfig } from 'expo/config';

import packageJson from './package.json';

// Expo reads this config by sucrase-transpiling ONLY this entry file and evaluating it via
// `require-from-string`; nested imports then fall through to Node's plain CJS loader, which has no
// `.ts` handler (Expo registers none). Register a lightweight TS require hook (sucrase is already an
// Expo dependency) and load the shared scheme helper with `require` — not `import`, which sucrase
// would hoist above this call — so native scheme registration stays a single source of truth with
// the RN linking prefixes. See the `mobile-deep-links-and-prod-cutover` rule.
/* eslint-disable @typescript-eslint/no-require-imports -- register must run before nested .ts require; ESM import would hoist above register */
require('sucrase/register/ts');

const {
  parseMobileDeepLinkSchemes,
}: typeof import('./src/config/deepLinkSchemes') = require('./src/config/deepLinkSchemes');
/* eslint-enable @typescript-eslint/no-require-imports */

const DEFAULT_UNIVERSAL_LINK_HOST = 'podverse.fm';

const trimToNull = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** Resolve a hostname from a value that may be a full URL (`https://podverse.fm`) or a bare host. */
const resolveHost = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
};

// Custom URL schemes registered natively (CFBundleURLTypes / Android intent filters). Env-driven and
// shared with the RN linking prefixes via `src/config/deepLinkSchemes.ts` so native registration and
// the JS `prefixes` list never drift. Beta ships `podverse-next` + legacy `podverse`; a fork sets
// EXPO_PUBLIC_MOBILE_DEEP_LINK_SCHEMES to its own scheme(s).
const deepLinkSchemes = parseMobileDeepLinkSchemes(
  process.env.EXPO_PUBLIC_MOBILE_DEEP_LINK_SCHEMES
);

const universalLinkHost =
  resolveHost(trimToNull(process.env.EXPO_PUBLIC_MOBILE_WEB_BASE_URL)) ??
  resolveHost(trimToNull(process.env.WEB_BASE_URL)) ??
  DEFAULT_UNIVERSAL_LINK_HOST;

const universalLinkPathPrefixes = ['/podcast/', '/episode/', '/playlist/', '/clip/', '/profile/'];

const config: ExpoConfig = {
  name: 'Podverse Next',
  slug: 'podverse-next',
  version: packageJson.version,
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  scheme: deepLinkSchemes,
  platforms: ['ios', 'android'],
  // Native cold-start splash (legacy wordmark on black). Kept visible in JS until i18n + auth
  // bootstrap finish — see App.tsx SplashHideGate. Top-level `splash` + plugin keep prebuild in sync.
  splash: {
    backgroundColor: '#000000',
    image: './assets/splash/banner.png',
    resizeMode: 'contain',
  },
  androidStatusBar: {
    backgroundColor: '#000000',
    barStyle: 'light-content',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.podverse.app.next',
    // CarPlay audio entitlement + App Group (12.7 / 12.16). The App ID `com.podverse.app.next`
    // has both provisioned in the Apple portal; these keys make `expo prebuild` emit a matching
    // .entitlements file so the gitignored ios/ project regenerates correctly (no Xcode-only edits).
    // Keep the group id in sync with PodverseNativeCache.appGroupIdentifier.
    entitlements: {
      'com.apple.developer.carplay-audio': true,
      'com.apple.security.application-groups': ['group.com.podverse.app.next'],
    },
    infoPlist: {
      UIBackgroundModes: ['audio'],
      // Local test-assets (:2111) and E2E API use http://localhost — allow local cleartext.
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true,
      },
      // Do NOT declare a CarPlay-only UIApplicationSceneManifest here. On Expo SDK 52 /
      // RN New Arch that suppresses the phone UIWindowScene → RCTKeyWindow() nil →
      // SafeAreaProvider `width` of undefined → black phone screen. CarPlay scene
      // connection is wired in AppDelegate via `./plugins/withPodverseCarPlay`
      // (`configurationForConnectingSceneSession` → PodverseCarPlaySceneDelegate).
    },
  },
  android: {
    package: 'com.podverse.app.next',
    permissions: [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.POST_NOTIFICATIONS',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        category: ['BROWSABLE', 'DEFAULT'],
        data: universalLinkPathPrefixes.map((pathPrefix) => ({
          host: universalLinkHost,
          pathPrefix,
          scheme: 'https',
        })),
      },
    ],
  },
  plugins: [
    'expo-dev-client',
    'expo-localization',
    'expo-notifications',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#000000',
        image: './assets/splash/banner.png',
        // Wide wordmark; default 100 is for square icons and looks tiny.
        imageWidth: 300,
        resizeMode: 'contain',
      },
    ],
    // Must run after expo-splash-screen — repairs empty <subviews/> so the logo ImageView exists.
    './plugins/withPodverseSplashScreen',
    [
      'expo-build-properties',
      {
        // ExoPlayer needs cleartext for E2E test-assets at http://10.0.2.2:2111 (and local API).
        android: {
          usesCleartextTraffic: true,
        },
      },
    ],
    './plugins/withPodverseCarPlay',
    ['./plugins/withPodverseAssociatedDomains', { host: universalLinkHost }],
  ],
};

export default config;
