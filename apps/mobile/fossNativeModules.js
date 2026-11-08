const fs = require('fs');

/** Play-store-only native modules. A UnifiedPush build leaves every one of these unlinked. */
const FIREBASE_NATIVE_MODULES = ['@react-native-firebase/app', '@react-native-firebase/messaging'];

const trimToNull = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * FCM is the default push provider. UnifiedPush and `none` do not link Firebase.
 * @param {NodeJS.ProcessEnv} env
 */
const wantsFcmNativeModules = (env) => {
  const push = trimToNull(env.EXPO_PUBLIC_MOBILE_PUSH_PROVIDER);
  return push !== 'unifiedpush' && push !== 'none';
};

/**
 * Store billing stays linked unless this build is the FOSS flavor or billing is unavailable.
 * @param {NodeJS.ProcessEnv} env
 */
const wantsStoreBillingNativeModule = (env) => {
  if (trimToNull(env.EXPO_PUBLIC_MOBILE_PUSH_PROVIDER) === 'unifiedpush') {
    return false;
  }
  return trimToNull(env.EXPO_PUBLIC_MOBILE_BILLING) !== 'unavailable';
};

/**
 * @param {string | undefined} value
 * @param {string} label
 * @returns {string | null}
 */
const existingFile = (value, label) => {
  const path = trimToNull(value);
  if (path === null) {
    return null;
  }
  if (!fs.existsSync(path)) {
    console.warn(`${label} is set but the file is missing (${path}). Firebase stays out of this build.`);
    return null;
  }
  return path;
};

/**
 * Paths Expo copies into the native projects. Missing files stay null so a local or E2E
 * build without them still compiles.
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ ios: string | null, android: string | null }}
 */
const googleServicesPaths = (env) => ({
  ios: existingFile(env.GOOGLE_SERVICES_INFO_PLIST, 'GOOGLE_SERVICES_INFO_PLIST'),
  android: existingFile(env.GOOGLE_SERVICES_JSON, 'GOOGLE_SERVICES_JSON'),
});

/**
 * Platform overrides for the app `react-native.config.js`. `null` tells Expo autolinking
 * to leave that platform out.
 * @param {NodeJS.ProcessEnv} env
 * @returns {Record<string, { platforms: { ios?: null, android?: null } }>}
 */
const reactNativeDependencyOverrides = (env) => {
  /** @type {Record<string, { platforms: { ios?: null, android?: null } }>} */
  const dependencies = {};

  if (!wantsStoreBillingNativeModule(env)) {
    dependencies['expo-iap'] = { platforms: { ios: null, android: null } };
  }

  const services = googleServicesPaths(env);
  const linkFirebase = wantsFcmNativeModules(env) && (services.ios !== null || services.android !== null);
  for (const name of FIREBASE_NATIVE_MODULES) {
    if (!linkFirebase) {
      dependencies[name] = { platforms: { ios: null, android: null } };
      continue;
    }
    /** @type {{ ios?: null, android?: null }} */
    const platforms = {};
    if (services.ios === null) {
      platforms.ios = null;
    }
    if (services.android === null) {
      platforms.android = null;
    }
    if (platforms.ios === null || platforms.android === null) {
      dependencies[name] = { platforms };
    }
  }

  return dependencies;
};

module.exports = {
  FIREBASE_NATIVE_MODULES,
  googleServicesPaths,
  reactNativeDependencyOverrides,
  wantsFcmNativeModules,
};
