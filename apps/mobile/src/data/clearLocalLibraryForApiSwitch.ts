import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

import { advanceAuthSessionGeneration } from '../auth/authRequestWithRefresh';
import { clearAllSecureTokens } from '../auth/secureTokenStorage';
import { nativePlaybackBridge } from '../bridge/nativePlaybackBridge';
import { writeCustomApiBaseUrl } from '../config/customApiEndpoint';
import { clearPublicClientConfig } from '../config/publicClientConfig';
import { downloadManager } from '../downloads/downloadManager';
import { DOWNLOADS_SUBDIRECTORY } from '../downloads/downloadStorage';
import { downloadStore } from '../downloads/downloadStore';
import { hydrateChannelActionChrome } from '../lib/channelActionChrome';
import { clearSectionChromeFlagsMemory } from '../lib/sectionChromeFlags';
import { clearAccountPushPreferences } from '../notifications/accountPushPreferenceStore';
import { clearBannerNotificationQueue } from '../notifications/bannerNotificationStore';
import { resetNotificationsInboxCache } from '../notifications/notificationsInboxCache';
import { resetNotificationStreamStore } from '../notifications/notificationStreamStore';
import { resetCrossDevicePlaybackStore } from '../playback/crossDevice/crossDevicePlaybackStore';
import { nowPlayingAddByRssSections } from '../playback/nowPlayingAddByRssSections';
import { publishPlaybackPositionAdoptions } from '../sync/playbackPositionAdoption';
import { publishPlaybackReconcileConflicts } from '../sync/playbackReconcileConflict';
import { syncQueue } from '../sync/syncQueue';
import {
  customApiSqliteTables,
  selectAsyncStorageKeysForApiSwitch,
  splitSignedOutCredentialIndexRows,
} from './customApiLocalClearPlan';
import { getDb, initializeDatabase, schema } from './db';
import { reprojectCarCacheAll } from './nativeCache/carCacheReproject';
import { addByRssCredentialStore } from './repositories/addByRssCredentialStore';

const PLAYBACK_JOURNAL_CURSOR_KEY = 'pv_mobile_playback_journal_cursor';
const LAST_PLAYBACK_KEY = 'pv_mobile_last_playback';

const PUSH_REGISTRATION_KEYS = ['push.fcm.registeredToken', 'push.up.registeredEndpoint'] as const;

/**
 * Erases this phone's copy of the previous server, then saves `baseUrl` and its website origin.
 * `null` restores the built-in address and drops the stored origin. A throw before that write
 * leaves the saved address alone. Nothing here contacts a server.
 */
export const clearLocalLibraryForApiSwitch = async (
  baseUrl: string | null,
  webOrigin: string | null
): Promise<void> => {
  clearPublicClientConfig();
  syncQueue.reset();
  advanceAuthSessionGeneration();
  await clearAllSecureTokens();

  await downloadManager.removeAll();
  const documentDirectory = FileSystem.documentDirectory;
  if (documentDirectory !== null) {
    const downloadsPath = `${documentDirectory}${DOWNLOADS_SUBDIRECTORY}`;
    const info = await FileSystem.getInfoAsync(downloadsPath);
    if (info.exists) {
      await FileSystem.deleteAsync(downloadsPath, { idempotent: true });
    }
  }

  await addByRssCredentialStore.clearAccountCredentials();
  await initializeDatabase();
  const credentialRows = await getDb()
    .select({
      accountIdText: schema.addByRssCredentialIndex.accountIdText,
      feedUrl: schema.addByRssCredentialIndex.feedUrl,
      updatedAt: schema.addByRssCredentialIndex.updatedAt,
    })
    .from(schema.addByRssCredentialIndex);
  const { kept: signedOutCredentialRows } = splitSignedOutCredentialIndexRows(credentialRows);

  const db = getDb();
  for (const table of customApiSqliteTables()) {
    await db.delete(table);
  }
  if (signedOutCredentialRows.length > 0) {
    await db.insert(schema.addByRssCredentialIndex).values(
      signedOutCredentialRows.map((row) => ({
        accountIdText: row.accountIdText,
        feedUrl: row.feedUrl,
        updatedAt: row.updatedAt,
      }))
    );
  }

  await nativePlaybackBridge.writePlaybackJournal('[]');
  await AsyncStorage.removeItem(PLAYBACK_JOURNAL_CURSOR_KEY);
  await AsyncStorage.removeItem(LAST_PLAYBACK_KEY);

  const storedKeys = await AsyncStorage.getAllKeys();
  const keysToClear = selectAsyncStorageKeysForApiSwitch(storedKeys);
  if (keysToClear.length > 0) {
    await AsyncStorage.multiRemove(keysToClear);
  }

  for (const key of PUSH_REGISTRATION_KEYS) {
    await SecureStore.deleteItemAsync(key);
  }

  resetNotificationStreamStore();
  resetCrossDevicePlaybackStore();
  resetNotificationsInboxCache();
  clearBannerNotificationQueue();
  clearAccountPushPreferences();
  nowPlayingAddByRssSections.reset();
  publishPlaybackReconcileConflicts([]);
  publishPlaybackPositionAdoptions([]);

  hydrateChannelActionChrome({ subscribedIdTexts: [] });
  downloadStore.hydrate([]);
  clearSectionChromeFlagsMemory();
  await reprojectCarCacheAll();

  await writeCustomApiBaseUrl(baseUrl, webOrigin);
};
