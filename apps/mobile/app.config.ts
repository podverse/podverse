import type { ExpoConfig } from 'expo/config';

import { APP_ROUTES } from '@podverse/helpers';

import packageJson from './package.json';
const DEFAULT_MOBILE_DEEP_LINK_SCHEMES = ['podverse-next', 'podverse'];

const stripSchemeSuffix = (value: string): string => {
  return value.replace(/:\/\/$/, '').replace(/:$/, '');
};

const parseMobileDeepLinkSchemes = (raw: string | undefined): string[] => {
  const parsed = (raw ?? '')
    .split(/[\s,]+/)
    .map((entry) => stripSchemeSuffix(entry.trim()))
    .filter((entry) => entry.length > 0);
  return parsed.length > 0 ? parsed : [...DEFAULT_MOBILE_DEEP_LINK_SCHEMES];
};

const getMobileBillingModeFromEnv = (): 'store' | 'unavailable' => {
  const billing = process.env.EXPO_PUBLIC_MOBILE_BILLING?.trim();
  const push = process.env.EXPO_PUBLIC_MOBILE_PUSH_PROVIDER?.trim();
  if (billing === 'unavailable' || push === 'unifiedpush') {
    return 'unavailable';
  }
  return 'store';
};

const MOBILE_UNIVERSAL_LINK_PATH_PREFIXES = [
  `${APP_ROUTES.PODCAST}/`,
  `${APP_ROUTES.EPISODE}/`,
  `${APP_ROUTES.PLAYLIST}/`,
  `${APP_ROUTES.CLIP}/`,
  `${APP_ROUTES.PROFILE}/`,
] as const;

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

const universalLinkPathPrefixes = [...MOBILE_UNIVERSAL_LINK_PATH_PREFIXES];

const config: ExpoConfig = {
  name: 'Podverse Next',
  slug: 'podverse-next',
  owner: 'podverse',
  extra: {
    eas: {
      projectId: 'b6f9f8a2-ea16-44b1-b725-2942c35b6f33',
    },
  },
  version: packageJson.version,
  orientation: 'portrait',
  icon: './assets/app-icons/podverse-icon.png',
  userInterfaceStyle: 'automatic',
  scheme: deepLinkSchemes,
  platforms: ['ios', 'android'],
  // Native cold-start splash. Kept visible in JS until i18n + auth bootstrap finish — see
  // App.tsx SplashController. Splash assets are configured by the expo-splash-screen plugin below.
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
      UIBackgroundModes: ['audio', 'fetch', 'remote-notification'],
      // Local test-assets (:2111) and E2E API use http://localhost — allow local cleartext.
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true,
      },
      // Do NOT declare a CarPlay-only UIApplicationSceneManifest here. On Expo SDK 57 this still
      // suppresses the phone UIWindowScene → RCTKeyWindow() nil →
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
    // The dev launcher only lists servers it discovers over Bonjour, so a cold launch from the
    // icon falls back to this URL. Android reaches the host's Metro through `adb reverse tcp:8081`
    // (set by `expo run:android` and `ensure-devices.sh`), so localhost works on both platforms.
    // The dev menu stays closed at launch, skips its onboarding card, and has no floating tools
    // button (it parks over the trailing header control). These are build-time defaults, so
    // Maestro's clearState cannot bring any of them back; shake, Cmd+D / Cmd+M, and the
    // three-finger long press still open the menu.
    [
      'expo-dev-client',
      {
        launchMode: 'most-recent',
        defaultLaunchURL: 'http://localhost:8081',
        showMenuAtLaunch: false,
        skipOnboarding: true,
        toolsButton: false,
      },
    ],
    'expo-localization',
    'expo-notifications',
    'expo-background-fetch',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#000000',
        image: './assets/splash/banner.png',
        imageWidth: 300,
        resizeMode: 'contain',
        android: {
          image: './assets/splash/icon.png',
          imageWidth: 200,
        },
      },
    ],
    // Must run after expo-splash-screen — repairs empty <subviews/> so the logo ImageView exists.
    './plugins/withPodverseSplashScreen',
    [
      'expo-build-properties',
      {
        ios: {
          // App platform floor (Expo SDK 57 / RN 0.86). Podspecs below 16.4 are clamped
          // by withPodverseIosPodBuildSettings so every pod target matches this floor.
          deploymentTarget: '16.4',
        },
        // ExoPlayer needs cleartext for E2E test-assets at http://10.0.2.2:2111 (and local API).
        android: {
          usesCleartextTraffic: true,
        },
      },
    ],
    './plugins/withPodverseIosPodBuildSettings',
    './plugins/withPodverseCarPlay',
    ['./plugins/withPodverseAssociatedDomains', { host: universalLinkHost }],
    // Adds the Play Billing permission and billing-ktx. Omitted when this build's billing mode is
    // unavailable. A FOSS prebuild must also exclude `expo-iap` from autolinking so the native
    // module is not compiled into the binary.
    ...(getMobileBillingModeFromEnv() === 'store' ? ['expo-iap'] : []),
  ],
};

export default config;
