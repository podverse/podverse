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
      // CarPlay audio scene (12.7 / detail 386). Only the CarPlay scene role is declared — the phone
      // app keeps its legacy UIApplicationDelegate window lifecycle. iOS instantiates
      // PodverseCarPlaySceneDelegate (compiled into the PodverseMediaEngine pod, referenced by ObjC
      // name) for the car even when the phone app is force-quit.
      UIApplicationSceneManifest: {
        UISceneConfigurations: {
          CPTemplateApplicationSceneSessionRoleApplication: [
            {
              UISceneClassName: 'CPTemplateApplicationScene',
              UISceneConfigurationName: 'PodverseCarPlay',
              UISceneDelegateClassName: 'PodverseCarPlaySceneDelegate',
            },
          ],
        },
      },
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
  plugins: ['expo-dev-client', 'expo-localization'],
};

export default config;
