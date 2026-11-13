import * as Notifications from 'expo-notifications';

import { getMobileConfig } from '../config';

let configured = false;

/**
 * While the app is in the foreground, iOS only shows a system banner when a handler asks for one.
 * FCM builds present banner, list, and sound. Other push providers leave the default alone.
 */
export const configureForegroundPushPresentation = (): void => {
  if (configured) {
    return;
  }
  if (getMobileConfig().pushProvider !== 'fcm') {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  configured = true;
};
