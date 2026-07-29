import type { ExpoConfig } from 'expo/config';

import packageJson from './package.json';

const config: ExpoConfig = {
  name: 'Podverse Next',
  slug: 'podverse-next',
  version: packageJson.version,
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  scheme: 'podverse-next',
  platforms: ['ios', 'android'],
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
    // ExoPlayer needs cleartext for E2E test-assets at http://10.0.2.2:2111 (and local API).
    usesCleartextTraffic: true,
    permissions: [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.POST_NOTIFICATIONS',
    ],
  },
  plugins: ['expo-dev-client', 'expo-localization', './plugins/withPodverseCarPlay'],
};

export default config;
