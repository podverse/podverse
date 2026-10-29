import type { FirebaseContext } from '@podverse/external-services-firebase';
import type { NotificationsContext } from '@podverse/notifications';

export type NotificationSendContexts = {
  firebase: FirebaseContext;
  notifications: NotificationsContext;
};

let contexts: NotificationSendContexts | undefined;

export function setNotificationSendContexts(next: NotificationSendContexts): void {
  contexts = next;
}

export function getNotificationSendContexts(): NotificationSendContexts {
  if (contexts === undefined) {
    throw new Error('Notification send contexts are not initialized');
  }
  return contexts;
}
