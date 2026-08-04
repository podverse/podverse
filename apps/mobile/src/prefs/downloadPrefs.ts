import { DEFAULT_DOWNLOAD_AUTO_DELETE, getPref, setPref } from './prefsStore';

// Auto-delete oldest completed downloads when over the storage cap (master step 13.8). Default
// **off** so users are never surprised by disappearing episodes; they opt in from the Downloads
// manage-storage section. Stored as a string boolean to match the other AsyncStorage prefs.
const DOWNLOAD_AUTO_DELETE_PREF_KEY = 'downloads.auto_delete';

export const readDownloadAutoDeleteEnabled = async (): Promise<boolean> => {
  const value = await getPref(DOWNLOAD_AUTO_DELETE_PREF_KEY);
  return value ?? DEFAULT_DOWNLOAD_AUTO_DELETE;
};

export const writeDownloadAutoDeleteEnabled = async (enabled: boolean): Promise<void> => {
  await setPref(DOWNLOAD_AUTO_DELETE_PREF_KEY, enabled);
};
