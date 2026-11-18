import * as FileSystem from 'expo-file-system/legacy';

import { downloadsRepository } from '../data/repositories/downloadsRepository';
import { sumChosenFolderBytes } from './chosenDownloadFolder';
import { DOWNLOADS_SUBDIRECTORY } from './downloadStorage';

export type DownloadStorageBreakdown = {
  /** Bytes used on the device (total − free). */
  deviceUsedBytes: number;
  deviceTotalBytes: number;
  /** Bytes in the private downloads folder, plus completed files in the chosen folder. */
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
 * Best-effort: a bucket that fails is zero, and the directory walk still returns.
 * Completed files in the chosen folder count in `downloadsBytes` only. They are outside
 * `documentDirectory`, so they are not part of `appDataBytes`.
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

  let chosenFolderBytes = 0;
  try {
    chosenFolderBytes = sumChosenFolderBytes(await downloadsRepository.list());
  } catch {
    // A listing failure leaves the chosen-folder total at zero.
  }

  const appDataBytes = Math.max(0, documentBytes - downloadsBytes);
  const cacheBytes = cacheDirectory !== null ? await directorySize(cacheDirectory) : 0;

  return {
    appDataBytes,
    cacheBytes,
    deviceTotalBytes,
    deviceUsedBytes,
    downloadsBytes: downloadsBytes + chosenFolderBytes,
  };
};
