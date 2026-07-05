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
    },
  },
  android: {
    package: 'com.podverse.app.next',
    permissions: [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    ],
  },
  plugins: ['expo-dev-client'],
};

export default config;
