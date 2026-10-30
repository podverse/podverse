import { NotificationCategoryEnum } from '@podverse/helpers';

import { getApiRequestService } from '../../factories/apiRequestService';
import { requestNotificationPermission } from './webpush/requestNotificationPermission';

export type FirstSubscribePushChoice = 'enable_push' | 'in_app_only';

const STORAGE_KEY_PREFIX = 'podverse.subscribe_push_prompt_answered:';

const storageKeyForAccount = (accountIdText: string): string => {
  return `${STORAGE_KEY_PREFIX}${accountIdText}`;
};

export const hasAnsweredFirstSubscribePushPrompt = (accountIdText: string): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }
  try {
    return window.localStorage.getItem(storageKeyForAccount(accountIdText)) === '1';
  } catch {
    return true;
  }
};

export const markFirstSubscribePushPromptAnswered = (accountIdText: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(storageKeyForAccount(accountIdText), '1');
  } catch {
    // Private browsing can refuse localStorage; the next visit may ask again.
  }
};

const MEDIA_PUSH_CATEGORIES = [
  NotificationCategoryEnum.NewContent,
  NotificationCategoryEnum.Livestream,
] as const;

export const accountHasAnyPushDevice = async (): Promise<boolean> => {
  const api = getApiRequestService();
  const [fcmDevices, webPushDevices, upDevice] = await Promise.all([
    api.reqAccountFCMDeviceGetAllForAccount(),
    api.reqAccountWebPushDeviceGetAllForAccount(),
    api.reqAccountUPDeviceGetForAccount(),
  ]);
  return fcmDevices.length > 0 || webPushDevices.length > 0 || upDevice !== null;
};

const setMediaPushEnabled = async (pushEnabled: boolean): Promise<void> => {
  const api = getApiRequestService();
  const existing = await api.reqNotificationPreferencesGet();
  await api.reqNotificationPreferencesUpdate({
    preferences: MEDIA_PUSH_CATEGORIES.map((category) => {
      const row = existing.find((candidate) => candidate.category === category);
      return {
        category,
        in_app_enabled: row?.in_app_enabled ?? true,
        push_enabled: pushEnabled,
      };
    }),
  });
};

const enableChannelInboxNotifications = async (channelIdText: string): Promise<void> => {
  try {
    await getApiRequestService().reqAccountNotificationChannelCreate({
      channel_id_text: channelIdText,
    });
  } catch (error) {
    console.warn('Could not enable in-app notifications for subscribed channel', error);
  }
};

/**
 * After the first Subscribe prompt on web: optionally register browser push, align media Push
 * prefs, and turn on inbox alerts for the channel just followed.
 */
export const applyFirstSubscribePushChoice = async (params: {
  accountIdText: string;
  channelIdText: string;
  choice: FirstSubscribePushChoice;
}): Promise<void> => {
  const { accountIdText, channelIdText, choice } = params;
  markFirstSubscribePushPromptAnswered(accountIdText);

  if (choice === 'enable_push') {
    const granted = await requestNotificationPermission();
    if (granted) {
      try {
        await setMediaPushEnabled(true);
      } catch (error) {
        console.warn('Could not turn on media push preferences after first subscribe', error);
      }
    }
  } else {
    try {
      const hasDevice = await accountHasAnyPushDevice();
      if (!hasDevice) {
        await setMediaPushEnabled(false);
      }
    } catch (error) {
      console.warn('Could not align media push preferences after in-app-only choice', error);
    }
  }

  await enableChannelInboxNotifications(channelIdText);
};
