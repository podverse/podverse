import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { runAutoDownloadBackgroundPass } from '../downloads/autoDownloadBackgroundPass';

export const AUTO_DOWNLOAD_BACKGROUND_NOTIFICATION_TASK = 'podverse-auto-download-notification';

const parseStringField = (data: Record<string, unknown>, key: string): string | null => {
  const value = data[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

TaskManager.defineTask(AUTO_DOWNLOAD_BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[auto-download] background notification task error', error);
    return;
  }

  if (data === undefined || data === null || typeof data !== 'object') {
    return;
  }

  // Notification response taps are not auto-download wakes.
  if ('actionIdentifier' in data) {
    return;
  }

  const payload =
    'data' in data && data.data !== null && typeof data.data === 'object'
      ? (data.data as Record<string, unknown>)
      : (data as Record<string, unknown>);

  const type = parseStringField(payload, 'type');
  if (type !== 'auto-download') {
    return;
  }

  const channelIdText = parseStringField(payload, 'channelIdText');
  const itemIdTextsRaw = parseStringField(payload, 'itemIdTexts');
  const pushItemIdTexts =
    itemIdTextsRaw === null
      ? undefined
      : new Set(
          itemIdTextsRaw
            .split(',')
            .map((text) => text.trim())
            .filter((text) => text.length > 0)
        );

  try {
    await runAutoDownloadBackgroundPass({
      ...(channelIdText !== null ? { channelIdTexts: [channelIdText] } : {}),
      ...(pushItemIdTexts !== undefined ? { pushItemIdTexts } : {}),
    });
  } catch (taskError: unknown) {
    console.warn('[auto-download] background notification pass failed', taskError);
  }
});

/**
 * Register the headless notification task. Safe to call more than once; call from the app entry
 * so the definition is loaded before a silent push arrives.
 */
export const registerAutoDownloadBackgroundNotificationTask = async (): Promise<void> => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      AUTO_DOWNLOAD_BACKGROUND_NOTIFICATION_TASK
    );
    if (!isRegistered) {
      await Notifications.registerTaskAsync(AUTO_DOWNLOAD_BACKGROUND_NOTIFICATION_TASK);
    }
  } catch (error: unknown) {
    console.warn('[auto-download] failed to register background notification task', error);
  }
};
