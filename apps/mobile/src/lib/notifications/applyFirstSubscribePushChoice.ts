import { NotificationCategoryEnum } from '@podverse/helpers';

import type { AuthRequestDeps } from '../../auth/authRequestWithRefresh';
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { notificationsRepository } from '../../data/repositories';
import { markFirstSubscribePushPromptAnswered } from '../../prefs/subscribePushPromptPrefs';
import { enablePushOnThisDevice } from '../../push/enablePushOnThisDevice';

export type FirstSubscribePushChoice = 'enable_push' | 'in_app_only';

const MEDIA_PUSH_CATEGORIES = [
  NotificationCategoryEnum.NewContent,
  NotificationCategoryEnum.Livestream,
] as const;

/** True when the account has an FCM, web push, or Unified Push device on any device. */
export const accountHasAnyPushDevice = async (auth: AuthRequestDeps): Promise<boolean> => {
  const [fcmDevices, webPushDevices, upDevice] = await Promise.all([
    requestWithMobileAuthRefresh(auth, (api) => api.reqAccountFCMDeviceGetAllForAccount()),
    requestWithMobileAuthRefresh(auth, (api) => api.reqAccountWebPushDeviceGetAllForAccount()),
    requestWithMobileAuthRefresh(auth, (api) => api.reqAccountUPDeviceGetForAccount()),
  ]);
  return fcmDevices.length > 0 || webPushDevices.length > 0 || upDevice !== null;
};

const setMediaPushEnabled = async (auth: AuthRequestDeps, pushEnabled: boolean): Promise<void> => {
  const existing = await notificationsRepository.listPreferences(auth);
  await notificationsRepository.updatePreferences(auth, {
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

const enableChannelInboxNotifications = async (
  auth: AuthRequestDeps,
  channelIdText: string
): Promise<void> => {
  try {
    await requestWithMobileAuthRefresh(auth, (api) =>
      api.reqAccountNotificationChannelCreate({ channel_id_text: channelIdText })
    );
  } catch (error) {
    console.warn('Could not enable in-app notifications for subscribed channel', error);
  }
};

/**
 * After the first Subscribe prompt, turn on channel inbox alerts and optionally register for
 * system push. Always marks the prompt answered for this account on this device.
 */
export const applyFirstSubscribePushChoice = async (params: {
  accountIdText: string;
  auth: AuthRequestDeps;
  channelIdText: string;
  choice: FirstSubscribePushChoice;
  locale: string;
}): Promise<void> => {
  const { accountIdText, auth, channelIdText, choice, locale } = params;

  await markFirstSubscribePushPromptAnswered(accountIdText);

  if (choice === 'enable_push') {
    const result = await enablePushOnThisDevice({ auth, locale });
    if (result.outcome === 'enabled') {
      try {
        await setMediaPushEnabled(auth, true);
      } catch (error) {
        console.warn('Could not turn on media push preferences after first subscribe', error);
      }
    }
  } else {
    try {
      const hasDevice = await accountHasAnyPushDevice(auth);
      if (!hasDevice) {
        await setMediaPushEnabled(auth, false);
      }
    } catch (error) {
      console.warn('Could not align media push preferences after in-app-only choice', error);
    }
  }

  await enableChannelInboxNotifications(auth, channelIdText);
};
