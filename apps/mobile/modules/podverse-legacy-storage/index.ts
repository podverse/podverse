/**
 * Android-only access to the external files directory and to this app's unfinished system
 * download jobs. iOS, an unlinked dev client, and a thrown native call return null or 0.
 */

import type { PodverseLegacyStorageNativeModule } from './src/PodverseLegacyStorageModule';
import { getPodverseLegacyStorageModule } from './src/PodverseLegacyStorageModule';

export type { PodverseLegacyStorageNativeModule };
export { getPodverseLegacyStorageModule };

/** Absolute path of `getExternalFilesDir(null)`, or null when it is unavailable. */
export const getAndroidExternalFilesDirectory = async (): Promise<string | null> => {
  const nativeModule = getPodverseLegacyStorageModule();
  if (nativeModule === null) {
    return null;
  }
  try {
    const path = await nativeModule.getExternalFilesDirectoryAsync();
    if (typeof path !== 'string' || path.length === 0) {
      return null;
    }
    return path;
  } catch {
    return null;
  }
};

/**
 * Removes this app's unfinished system download jobs that are still in the external files
 * directory, the cache directory, or have no local file yet. Returns how many were removed.
 */
export const removeUnfinishedAndroidDownloadJobs = async (): Promise<number> => {
  const nativeModule = getPodverseLegacyStorageModule();
  if (nativeModule === null) {
    return 0;
  }
  try {
    const count = await nativeModule.removeUnfinishedDownloadJobsAsync();
    if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) {
      return 0;
    }
    return count;
  } catch {
    return 0;
  }
};
