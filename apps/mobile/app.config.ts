import type { ExpoConfig } from 'expo/config';

import { googleServicesPaths, wantsFcmNativeModules } from './fossNativeModules';
import packageJson from './package.json';
import {
  MOBILE_UNIVERSAL_LINK_PATH_PREFIXES,
  parseMobileDeepLinkSchemes,
} from './src/config/deepLinkSchemes';

const getMobileBillingModeFromEnv = (): 'store' | 'unavailable' => {
  const billing = process.env.EXPO_PUBLIC_MOBILE_BILLING?.trim();
  const push = process.env.EXPO_PUBLIC_MOBILE_PUSH_PROVIDER?.trim();
  if (billing === 'unavailable' || push === 'unifiedpush') {
    return 'unavailable';
  }
  return 'store';
};

const trimToNull = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** Resolve a hostname from a value that may be a full URL (`https://example.com`) or a bare host. */
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
// shared with the RN linking prefixes via `src/config/deepLinkSchemes.js` so native registration and
// the JS `prefixes` list never drift. Beta ships `podverse-next` + legacy `podverse`; a fork sets
// EXPO_PUBLIC_MOBILE_DEEP_LINK_SCHEMES to its own scheme(s).
const deepLinkSchemes = parseMobileDeepLinkSchemes(
  process.env.EXPO_PUBLIC_MOBILE_DEEP_LINK_SCHEMES
);

const universalLinkHost = resolveHost(trimToNull(process.env.EXPO_PUBLIC_MOBILE_WEB_BASE_URL));

const universalLinkPathPrefixes = [...MOBILE_UNIVERSAL_LINK_PATH_PREFIXES];

const associatedDomainsPlugin = (host: string): [string, { host: string }] => [
  './plugins/withPodverseAssociatedDomains',
  { host },
];

const associatedDomainsPlugins: NonNullable<ExpoConfig['plugins']> =
  universalLinkHost === null ? [] : [associatedDomainsPlugin(universalLinkHost)];

const storeBillingPlugins: NonNullable<ExpoConfig['plugins']> =
  getMobileBillingModeFromEnv() === 'store' ? ['expo-iap'] : [];

const googleServices = googleServicesPaths(process.env);
const linkFirebase =
  wantsFcmNativeModules(process.env) &&
  (googleServices.ios !== null || googleServices.android !== null);

const firebasePlugins: NonNullable<ExpoConfig['plugins']> = linkFirebase
  ? ['@react-native-firebase/app', '@react-native-firebase/messaging']
  : [];

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
  orientation: 'default',
  icon: './assets/app-icons/podverse-icon.png',
  userInterfaceStyle: 'automatic',
  scheme: deepLinkSchemes,
  platforms: ['ios', 'android'],
  // Native cold-start splash. Kept visible in JS until i18n + auth bootstrap finish — see
  // App.tsx SplashController. Splash assets are configured by the expo-splash-screen plugin below.
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.podverse.app.next',
    ...(googleServices.ios === null ? {} : { googleServicesFile: googleServices.ios }),
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
      // Do not declare UIApplicationSceneManifest here. Expo's prebuild generates the phone
      // scene (SceneDelegate + manifest entry), and `./plugins/withPodverseCarPlay` adds the
      // CarPlay scene beside it. A manifest without the phone entry leaves the phone with no
      // window (black screen).
    },
  },
  android: {
    package: 'com.podverse.app.next',
    ...(googleServices.android === null ? {} : { googleServicesFile: googleServices.android }),
    permissions: [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.WAKE_LOCK',
    ],
    ...(universalLinkHost === null
      ? {}
      : {
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
        }),
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
          // App platform floor. Podspecs below 16.4 are clamped by
          // withPodverseIosPodBuildSettings so every pod target matches this floor.
          deploymentTarget: '16.4',
          // Expo's prebuilt ExpoModulesCore.xcframework is built with Swift 6.3.1, and the
          // Swift 6.4 compiler in Xcode 27 refuses to import it. Compile Expo modules from
          // source until the shipped swiftinterface reports Swift 6.4 or newer.
          usePrecompiledModules: false,
          // React Native Firebase resolves the iOS SDK through Swift packages. Those
          // packages collide under static linkage, so a build that links Firebase uses
          // dynamic frameworks. Builds without the iOS Google services file leave the
          // default linking so local and E2E builds stay unchanged.
          ...(linkFirebase && googleServices.ios !== null
            ? { useFrameworks: 'dynamic' as const }
            : {}),
        },
        // ExoPlayer needs cleartext for E2E test-assets at http://10.0.2.2:2111 (and local API).
        android: {
          usesCleartextTraffic: true,
        },
      },
    ],
    './plugins/withPodverseIosPodBuildSettings',
    './plugins/withPodverseCarPlay',
    ...associatedDomainsPlugins,
    // Adds the Play Billing permission and billing-ktx. Omitted when this build's billing mode is
    // unavailable. `react-native.config.js` also drops `expo-iap` and React Native Firebase from
    // autolinking on a UnifiedPush build, and drops Firebase when no Google services file exists.
    ...storeBillingPlugins,
    ...firebasePlugins,
    ['expo-screen-orientation', { initialOrientation: 'PORTRAIT_UP' }],
    './plugins/withPodverseVideoPlayback',
  ],
};

export default config;
