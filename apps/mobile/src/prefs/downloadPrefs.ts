import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_DOWNLOAD_QUOTA_BYTES } from '../downloads/downloadQuota';
import { DEFAULT_DOWNLOAD_AUTO_DELETE, getPref, setPref } from './prefsStore';

/**
 * Download storage prefs (device-local AsyncStorage). The limit-reached auto-delete toggle reuses
 * the historical `downloads.auto_delete` key so existing installs keep their choice.
 */

const DOWNLOAD_AUTO_DELETE_DEVICE_LOW_KEY = 'downloads.auto_delete_device_low';
const DOWNLOAD_QUOTA_BYTES_KEY = 'downloads.quota_bytes';

/** Sentinel stored for an uncapped download library. */
export const DOWNLOAD_QUOTA_UNLIMITED = 0;

export const DEFAULT_DOWNLOAD_AUTO_DELETE_DEVICE_LOW = false;

export type DownloadQuotaOptionBytes = typeof DOWNLOAD_QUOTA_UNLIMITED | number;

const QUOTA_PRESETS_BYTES = [
  1 * 1024 * 1024 * 1024,
  2 * 1024 * 1024 * 1024,
  5 * 1024 * 1024 * 1024,
  10 * 1024 * 1024 * 1024,
  20 * 1024 * 1024 * 1024,
  50 * 1024 * 1024 * 1024,
] as const;

export const DOWNLOAD_QUOTA_PRESET_BYTES: readonly number[] = QUOTA_PRESETS_BYTES;

export const readDownloadAutoDeleteOnLimitEnabled = async (): Promise<boolean> => {
  const value = await getPref('downloads.auto_delete');
  return value ?? DEFAULT_DOWNLOAD_AUTO_DELETE;
};

export const writeDownloadAutoDeleteOnLimitEnabled = async (enabled: boolean): Promise<void> => {
  await setPref('downloads.auto_delete', enabled);
};

/** @deprecated Use readDownloadAutoDeleteOnLimitEnabled — same storage key. */
export const readDownloadAutoDeleteEnabled = readDownloadAutoDeleteOnLimitEnabled;

/** @deprecated Use writeDownloadAutoDeleteOnLimitEnabled — same storage key. */
export const writeDownloadAutoDeleteEnabled = writeDownloadAutoDeleteOnLimitEnabled;

export const readDownloadAutoDeleteOnDeviceLowEnabled = async (): Promise<boolean> => {
  const stored = await AsyncStorage.getItem(DOWNLOAD_AUTO_DELETE_DEVICE_LOW_KEY);
  if (stored === 'true') {
    return true;
  }
  if (stored === 'false') {
    return false;
  }
  return DEFAULT_DOWNLOAD_AUTO_DELETE_DEVICE_LOW;
};

export const writeDownloadAutoDeleteOnDeviceLowEnabled = async (
  enabled: boolean
): Promise<void> => {
  await AsyncStorage.setItem(DOWNLOAD_AUTO_DELETE_DEVICE_LOW_KEY, enabled ? 'true' : 'false');
};

/**
 * User download cap in bytes, or `DOWNLOAD_QUOTA_UNLIMITED` (0). Defaults to 10 GiB when unset.
 * Legacy installs that never set a quota still get the new 10 GiB default (not the old 3 GiB
 * hardcode).
 */
export const readDownloadQuotaBytes = async (): Promise<number> => {
  const stored = await AsyncStorage.getItem(DOWNLOAD_QUOTA_BYTES_KEY);
  if (stored === null || stored === '') {
    return DEFAULT_DOWNLOAD_QUOTA_BYTES;
  }
  if (stored === 'unlimited') {
    return DOWNLOAD_QUOTA_UNLIMITED;
  }
  const parsed = Number.parseInt(stored, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_DOWNLOAD_QUOTA_BYTES;
  }
  return parsed;
};

export const writeDownloadQuotaBytes = async (bytes: number): Promise<void> => {
  if (bytes === DOWNLOAD_QUOTA_UNLIMITED) {
    await AsyncStorage.setItem(DOWNLOAD_QUOTA_BYTES_KEY, 'unlimited');
    return;
  }
  await AsyncStorage.setItem(DOWNLOAD_QUOTA_BYTES_KEY, String(Math.max(0, Math.round(bytes))));
};

export const isDownloadQuotaUnlimited = (quotaBytes: number): boolean =>
  quotaBytes === DOWNLOAD_QUOTA_UNLIMITED;
