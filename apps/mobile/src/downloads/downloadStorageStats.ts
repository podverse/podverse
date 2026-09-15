import * as FileSystem from 'expo-file-system';

import { DOWNLOADS_SUBDIRECTORY } from './downloadStorage';

export type DownloadStorageBreakdown = {
  /** Bytes used on the device (total − free). */
  deviceUsedBytes: number;
  deviceTotalBytes: number;
  /** Bytes under documentDirectory/downloads. */
  downloadsBytes: number;
  /** documentDirectory total minus downloads folder. */
  appDataBytes: number;
  /** cacheDirectory total. */
  cacheBytes: number;
};

const directorySize = async (absolutePath: string): Promise<number> => {
  try {
    const info = await FileSystem.getInfoAsync(absolutePath);
    if (!info.exists) {
      return 0;
    }
    if (!info.isDirectory) {
      return 'size' in info && typeof info.size === 'number' ? info.size : 0;
    }
    const entries = await FileSystem.readDirectoryAsync(absolutePath);
    let total = 0;
    for (const name of entries) {
      const childPath = absolutePath.endsWith('/')
        ? `${absolutePath}${name}`
        : `${absolutePath}/${name}`;
      total += await directorySize(childPath);
    }
    return total;
  } catch {
    return 0;
  }
};

/**
 * Measure device / downloads / app-data / cache buckets for Settings → Downloads.
 * Best-effort: failures return zeros for that bucket rather than throwing.
 */
export const measureDownloadStorageBreakdown = async (): Promise<DownloadStorageBreakdown> => {
  let deviceUsedBytes = 0;
  let deviceTotalBytes = 0;
  try {
    const [free, total] = await Promise.all([
      FileSystem.getFreeDiskStorageAsync(),
      FileSystem.getTotalDiskCapacityAsync(),
    ]);
    deviceTotalBytes = total;
    deviceUsedBytes = Math.max(0, total - free);
  } catch {
    // Simulators can fail disk APIs.
  }

  const documentDirectory = FileSystem.documentDirectory;
  const cacheDirectory = FileSystem.cacheDirectory;

  let downloadsBytes = 0;
  let documentBytes = 0;
  if (documentDirectory !== null) {
    const downloadsPath = `${documentDirectory}${DOWNLOADS_SUBDIRECTORY}`;
    downloadsBytes = await directorySize(downloadsPath);
    documentBytes = await directorySize(documentDirectory);
  }

  const appDataBytes = Math.max(0, documentBytes - downloadsBytes);
  const cacheBytes = cacheDirectory !== null ? await directorySize(cacheDirectory) : 0;

  return {
    appDataBytes,
    cacheBytes,
    deviceTotalBytes,
    deviceUsedBytes,
    downloadsBytes,
  };
};
