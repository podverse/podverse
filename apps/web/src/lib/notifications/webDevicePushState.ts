import type { DevicePushState } from '@podverse/helpers';

/**
 * This browser's push state for the signed-in account. An account Unified Push device counts as
 * enabled because web settings treat Web Push and Unified Push as alternatives.
 */
export const getWebDevicePushState = (params: {
  accountUnifiedPushRegistered: boolean;
  notificationApiAvailable: boolean;
  permission: NotificationPermission;
  thisBrowserWebPushRegistered: boolean;
  vapidPublicKeyConfigured: boolean;
}): DevicePushState => {
  if (!params.notificationApiAvailable || !params.vapidPublicKeyConfigured) {
    return 'unsupported';
  }
  if (params.accountUnifiedPushRegistered) {
    return 'enabled';
  }
  if (params.permission === 'granted' && params.thisBrowserWebPushRegistered) {
    return 'enabled';
  }
  if (params.permission === 'denied') {
    return 'blocked';
  }
  return 'can_request';
};

/** True when this browser exposes the Notification, service worker, and Push APIs. */
export const isWebPushApiAvailable = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
};
