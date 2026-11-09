import { createRequire } from 'node:module';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);

/** Keys the autolinking helpers read. Fixtures set only the keys a case exercises. */
type FossNativeModulesEnv = {
  EXPO_PUBLIC_MOBILE_BILLING?: string;
  EXPO_PUBLIC_MOBILE_PUSH_PROVIDER?: string;
  GOOGLE_SERVICES_INFO_PLIST?: string;
  GOOGLE_SERVICES_JSON?: string;
};

// createRequire returns an untyped module. The assertion matches module.exports.
const { FIREBASE_NATIVE_MODULES, googleServicesPaths, reactNativeDependencyOverrides } =
  require('./fossNativeModules') as {
    FIREBASE_NATIVE_MODULES: string[];
    googleServicesPaths: (env: FossNativeModulesEnv) => {
      ios: string | null;
      android: string | null;
    };
    reactNativeDependencyOverrides: (
      env: FossNativeModulesEnv
    ) => Record<string, { platforms: { ios?: null; android?: null } }>;
  };

const existingFile = path.join(__dirname, 'package.json');
const missingFile = path.join(__dirname, 'missing-google-services.json');

describe('fossNativeModules', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('links Firebase on the platform that has a services file', () => {
    expect(
      reactNativeDependencyOverrides({
        EXPO_PUBLIC_MOBILE_PUSH_PROVIDER: 'fcm',
        GOOGLE_SERVICES_INFO_PLIST: existingFile,
      })['@react-native-firebase/app']
    ).toEqual({ platforms: { android: null } });
    expect(googleServicesPaths({ GOOGLE_SERVICES_INFO_PLIST: existingFile }).ios).toBe(
      existingFile
    );
  });

  it('leaves Firebase and store billing out of a UnifiedPush build', () => {
    const dependencies = reactNativeDependencyOverrides({
      EXPO_PUBLIC_MOBILE_BILLING: 'store',
      EXPO_PUBLIC_MOBILE_PUSH_PROVIDER: 'unifiedpush',
      GOOGLE_SERVICES_INFO_PLIST: existingFile,
      GOOGLE_SERVICES_JSON: existingFile,
    });

    for (const name of FIREBASE_NATIVE_MODULES) {
      expect(dependencies[name]).toEqual({ platforms: { ios: null, android: null } });
    }
    expect(dependencies['expo-iap']).toEqual({ platforms: { ios: null, android: null } });
  });

  it('leaves Firebase out when the services file is missing', () => {
    const dependencies = reactNativeDependencyOverrides({
      EXPO_PUBLIC_MOBILE_PUSH_PROVIDER: 'fcm',
      GOOGLE_SERVICES_JSON: missingFile,
    });
    expect(dependencies['@react-native-firebase/messaging']).toEqual({
      platforms: { ios: null, android: null },
    });
    expect(dependencies['expo-iap']).toBeUndefined();
  });

  it('leaves store billing out when billing is unavailable', () => {
    expect(
      reactNativeDependencyOverrides({
        EXPO_PUBLIC_MOBILE_BILLING: 'unavailable',
        EXPO_PUBLIC_MOBILE_PUSH_PROVIDER: 'fcm',
      })['expo-iap']
    ).toEqual({ platforms: { ios: null, android: null } });
  });
});
