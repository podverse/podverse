import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import { runAutoDownloadBackgroundPass } from './autoDownloadBackgroundPass';

export const AUTO_DOWNLOAD_BACKGROUND_FETCH_TASK = 'podverse-auto-download-fetch';

TaskManager.defineTask(AUTO_DOWNLOAD_BACKGROUND_FETCH_TASK, async () => {
  try {
    await runAutoDownloadBackgroundPass();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error: unknown) {
    console.warn('[auto-download] background fetch failed', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register periodic background fetch for auto-download channels. Timing is OS-controlled.
 */
export const registerAutoDownloadBackgroundFetch = async (): Promise<void> => {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(AUTO_DOWNLOAD_BACKGROUND_FETCH_TASK);
    if (isRegistered) {
      return;
    }

    await BackgroundFetch.registerTaskAsync(AUTO_DOWNLOAD_BACKGROUND_FETCH_TASK, {
      minimumInterval: 60 * 15,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (error: unknown) {
    console.warn('[auto-download] failed to register background fetch', error);
  }
};
