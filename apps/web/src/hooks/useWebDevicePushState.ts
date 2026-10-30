import type { DevicePushState } from '@podverse/helpers';

import { useConfig } from '../contexts/Config';
import { useNotifications } from '../contexts/Notifications';
import {
  getWebDevicePushState,
  isWebPushApiAvailable,
} from '../lib/notifications/webDevicePushState';

/**
 * This browser's push state for the signed-in account. `isChecked` is false until the
 * Notifications provider has finished checking permission and registration; an unsupported
 * browser is checked at once.
 */
export function useWebDevicePushState(): { devicePushState: DevicePushState; isChecked: boolean } {
  const config = useConfig();
  const { permission, pushStateChecked, registered, upRegistered } = useNotifications();
  const devicePushState = getWebDevicePushState({
    accountUnifiedPushRegistered: upRegistered,
    notificationApiAvailable: isWebPushApiAvailable(),
    permission,
    thisBrowserWebPushRegistered: registered,
    vapidPublicKeyConfigured: Boolean(config.public.notifications.webpush.vapidPublicKey),
  });
  return {
    devicePushState,
    isChecked: devicePushState === 'unsupported' || pushStateChecked,
  };
}
