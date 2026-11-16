/**
 * Typed accessor for the native `PodverseLegacyStorage` module. Resolves lazily so pure-JS unit
 * tests and builds without a native rebuild do not throw at import time. `expo-modules-core` is
 * required inside the function so Node vitest can import this file without the native package.
 * iOS, a stale dev client, and Node tests have no linked module and receive null.
 */

export type PodverseLegacyStorageNativeModule = {
  getExternalFilesDirectoryAsync(): Promise<string | null>;
  removeUnfinishedDownloadJobsAsync(): Promise<number>;
};

type ExpoModulesCore = {
  requireNativeModule: <T>(name: string) => T;
};

const isExpoModulesCore = (value: unknown): value is ExpoModulesCore => {
  if (typeof value !== 'object' || value === null || !('requireNativeModule' in value)) {
    return false;
  }
  return typeof value.requireNativeModule === 'function';
};

let cachedModule: PodverseLegacyStorageNativeModule | null | undefined;

/**
 * Returns the native module when linked, otherwise null. iOS and a dev client without this
 * module return null rather than crashing the app.
 */
export function getPodverseLegacyStorageModule(): PodverseLegacyStorageNativeModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy so Node tests never load expo-modules-core
    const loaded: unknown = require('expo-modules-core');
    if (!isExpoModulesCore(loaded)) {
      cachedModule = null;
      return cachedModule;
    }
    cachedModule =
      loaded.requireNativeModule<PodverseLegacyStorageNativeModule>('PodverseLegacyStorage');
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}
