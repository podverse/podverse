import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { AutoDownloadCatchUpLimit } from '../downloads/autoDownloadPlanner';
import {
  AUTO_DOWNLOAD_CATCH_UP_LIMIT_PRESETS,
  DEFAULT_AUTO_DOWNLOAD_CATCH_UP_LIMIT,
} from '../downloads/autoDownloadPlanner';
import type { ChosenFolderKind } from '../downloads/chosenDownloadFolder';
import { chosenFolderSwitchState } from '../downloads/chosenDownloadFolder';
import { DEFAULT_DOWNLOAD_QUOTA_BYTES } from '../downloads/downloadQuota';
import { classifyV4SharedFolder } from '../migration/v4/v4DownloadNames';
import { DEFAULT_DOWNLOAD_AUTO_DELETE, getPref, setPref } from './prefsStore';

/**
 * Download storage prefs (device-local AsyncStorage). The limit-reached auto-delete toggle is the
 * AsyncStorage key `downloads.auto_delete`. `downloads.chosen_folder` is the Android chosen-folder
 * switch. `EXT_STORAGE_DLOAD_LOCATION` is read only: it holds the folder URI saved on this device.
 * Neither key is cleared on sign-out.
 */

const DOWNLOAD_AUTO_DELETE_DEVICE_LOW_KEY = 'downloads.auto_delete_device_low';
const CHOSEN_DOWNLOAD_FOLDER_SWITCH_KEY = 'downloads.chosen_folder';
/** Read only. Never written or removed by this module. */
const LEGACY_SHARED_DOWNLOAD_FOLDER_KEY = 'EXT_STORAGE_DLOAD_LOCATION';
const DOWNLOAD_QUOTA_BYTES_KEY = 'downloads.quota_bytes';
const DOWNLOAD_AUTO_DOWNLOAD_DEFAULT_KEY = 'downloads.auto_download_default';
const DOWNLOAD_AUTO_DOWNLOAD_CELLULAR_DEFAULT_KEY = 'downloads.auto_download_cellular_default';
const DOWNLOAD_AUTO_DOWNLOAD_CATCH_UP_LIMIT_KEY = 'downloads.auto_download_catch_up_limit';

/** Sentinel stored for an uncapped download library. */
export const DOWNLOAD_QUOTA_UNLIMITED = 0;

export const DEFAULT_DOWNLOAD_AUTO_DELETE_DEVICE_LOW = false;

/** New subscriptions inherit this; off so users must opt in. */
export const DEFAULT_AUTO_DOWNLOAD_ON_SUBSCRIBE = false;

/** New auto-download channels inherit Wi‑Fi-only unless the user opts into cellular. */
export const DEFAULT_AUTO_DOWNLOAD_ALLOW_CELLULAR = false;

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
 * User download cap in bytes, or `DOWNLOAD_QUOTA_UNLIMITED` (0). An unset value returns
 * `DEFAULT_DOWNLOAD_QUOTA_BYTES`. The stored `'unlimited'` sentinel is an uncapped library.
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

const readStoredBoolean = async (key: string, fallback: boolean): Promise<boolean> => {
  const stored = await AsyncStorage.getItem(key);
  if (stored === 'true') {
    return true;
  }
  if (stored === 'false') {
    return false;
  }
  return fallback;
};

export const readAutoDownloadDefaultEnabled = async (): Promise<boolean> =>
  readStoredBoolean(DOWNLOAD_AUTO_DOWNLOAD_DEFAULT_KEY, DEFAULT_AUTO_DOWNLOAD_ON_SUBSCRIBE);

export const writeAutoDownloadDefaultEnabled = async (enabled: boolean): Promise<void> => {
  await AsyncStorage.setItem(DOWNLOAD_AUTO_DOWNLOAD_DEFAULT_KEY, enabled ? 'true' : 'false');
};

export const readAutoDownloadCellularDefaultEnabled = async (): Promise<boolean> =>
  readStoredBoolean(
    DOWNLOAD_AUTO_DOWNLOAD_CELLULAR_DEFAULT_KEY,
    DEFAULT_AUTO_DOWNLOAD_ALLOW_CELLULAR
  );

export const writeAutoDownloadCellularDefaultEnabled = async (enabled: boolean): Promise<void> => {
  await AsyncStorage.setItem(
    DOWNLOAD_AUTO_DOWNLOAD_CELLULAR_DEFAULT_KEY,
    enabled ? 'true' : 'false'
  );
};

const isCatchUpLimit = (value: number): value is AutoDownloadCatchUpLimit => {
  return AUTO_DOWNLOAD_CATCH_UP_LIMIT_PRESETS.some((preset) => preset === value);
};

export const readAutoDownloadCatchUpLimit = async (): Promise<AutoDownloadCatchUpLimit> => {
  const stored = await AsyncStorage.getItem(DOWNLOAD_AUTO_DOWNLOAD_CATCH_UP_LIMIT_KEY);
  if (stored === null) {
    return DEFAULT_AUTO_DOWNLOAD_CATCH_UP_LIMIT;
  }
  const parsed = Number(stored);
  return isCatchUpLimit(parsed) ? parsed : DEFAULT_AUTO_DOWNLOAD_CATCH_UP_LIMIT;
};

export const writeAutoDownloadCatchUpLimit = async (
  limit: AutoDownloadCatchUpLimit
): Promise<void> => {
  await AsyncStorage.setItem(DOWNLOAD_AUTO_DOWNLOAD_CATCH_UP_LIMIT_KEY, String(limit));
};

const chosenFolderPlatform = (): 'android' | 'ios' | 'other' => {
  if (Platform.OS === 'android') {
    return 'android';
  }
  if (Platform.OS === 'ios') {
    return 'ios';
  }
  return 'other';
};

const folderKindFromStoredValue = (value: string | null): ChosenFolderKind => {
  const classified = classifyV4SharedFolder(value);
  if (classified === null) {
    return null;
  }
  return classified.kind;
};

const readChosenFolderSnapshot = async (): Promise<{
  folder: string | null;
  pref: string | null;
}> => {
  const [pref, folder] = await Promise.all([
    AsyncStorage.getItem(CHOSEN_DOWNLOAD_FOLDER_SWITCH_KEY),
    AsyncStorage.getItem(LEGACY_SHARED_DOWNLOAD_FOLDER_KEY),
  ]);
  return { folder, pref };
};

export const readChosenDownloadFolderSwitch = async (): Promise<{
  visible: boolean;
  enabled: boolean;
}> => {
  const { folder, pref } = await readChosenFolderSnapshot();
  return chosenFolderSwitchState({
    folderKind: folderKindFromStoredValue(folder),
    platform: chosenFolderPlatform(),
    pref,
  });
};

/** Tree URI when the switch is on and the saved value is `saf_tree`. Otherwise null. */
export const readChosenDownloadFolderTreeUri = async (): Promise<string | null> => {
  const { folder, pref } = await readChosenFolderSnapshot();
  const state = chosenFolderSwitchState({
    folderKind: folderKindFromStoredValue(folder),
    platform: chosenFolderPlatform(),
    pref,
  });
  if (!state.enabled) {
    return null;
  }
  const classified = classifyV4SharedFolder(folder);
  if (classified === null || classified.kind !== 'saf_tree') {
    return null;
  }
  return classified.uri;
};

export const writeChosenDownloadFolderEnabled = async (enabled: boolean): Promise<void> => {
  await AsyncStorage.setItem(CHOSEN_DOWNLOAD_FOLDER_SWITCH_KEY, enabled ? 'true' : 'false');
};
