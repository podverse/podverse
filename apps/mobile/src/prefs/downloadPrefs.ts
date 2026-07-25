import AsyncStorage from '@react-native-async-storage/async-storage';

// Auto-delete oldest completed downloads when over the storage cap (master step 13.8). Default
// **off** so users are never surprised by disappearing episodes; they opt in from the Downloads
// manage-storage section. Stored as a string boolean to match the other AsyncStorage prefs.
const DOWNLOAD_AUTO_DELETE_PREF_KEY = 'downloads.auto_delete';

export const DEFAULT_DOWNLOAD_AUTO_DELETE = false;

export const readDownloadAutoDeleteEnabled = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(DOWNLOAD_AUTO_DELETE_PREF_KEY);
  if (value === null) {
    return DEFAULT_DOWNLOAD_AUTO_DELETE;
  }
  return value === 'true';
};

export const writeDownloadAutoDeleteEnabled = async (enabled: boolean): Promise<void> => {
  await AsyncStorage.setItem(DOWNLOAD_AUTO_DELETE_PREF_KEY, enabled ? 'true' : 'false');
};
