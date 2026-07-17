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
    infoPlist: {
      UIBackgroundModes: ['audio'],
      // Local test-assets (:2111) and E2E API use http://localhost — allow local cleartext.
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true,
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
