import * as Notifications from 'expo-notifications';

import { getMobileConfig } from '../config';
import { extractNotificationTargetPath, HOME_FALLBACK_PATH } from './notificationTarget';

/**
 * Notification payloads carry a content type + ids, an explicit `url` / `link_path`, or a legacy
 * `{ type, id_text }` pair. Those resolve to a Home-stack path when the destination has a parent
 * (podcast > episode, album > track) and then go through the same pending-deep-link buffer +
 * `getStateFromPath` mapping used for universal links. Malformed/unknown payloads fall back to Home.
 */

export type NotificationOpenUnsubscribe = () => void;

const isPushRoutingEnabled = (): boolean => {
  return getMobileConfig().pushProvider !== 'none';
};

export { extractNotificationTargetPath, HOME_FALLBACK_PATH } from './notificationTarget';

const resolveOpenedNotificationPath = (response: Notifications.NotificationResponse): string => {
  const data = response.notification.request.content.data;
  return extractNotificationTargetPath(data) ?? HOME_FALLBACK_PATH;
};

/**
 * Cold-start tap: if the app was launched by tapping a notification, resolve its target path.
 * Returns `null` when the app was not launched from a notification (so the caller leaves the
 * pending-deep-link buffer untouched).
 */
export const getInitialNotificationDeepLinkUrl = async (): Promise<string | null> => {
  if (!isPushRoutingEnabled()) {
    return null;
  }

  const lastResponse = await Notifications.getLastNotificationResponseAsync();
  if (lastResponse === null || lastResponse === undefined) {
    return null;
  }

  return resolveOpenedNotificationPath(lastResponse);
};

/**
 * Foreground/background tap: subscribe to notification-open events and emit the resolved target
 * path. No-op (returns an empty unsubscribe) when push routing is disabled for the flavor.
 */
export const subscribeToNotificationOpen = (
  onOpen: (url: string) => void
): NotificationOpenUnsubscribe => {
  if (!isPushRoutingEnabled()) {
    return () => {};
  }

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onOpen(resolveOpenedNotificationPath(response));
  });

  return () => {
    subscription.remove();
  };
};
