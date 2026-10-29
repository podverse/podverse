import type { DevicePushState } from '@podverse/helpers/notificationPush';

import type { MobilePushProvider } from '../config/env';
import type { PushPermissionRequestResult } from './fcmTransport';

export type DevicePushReading = {
  fcmPermission: PushPermissionRequestResult;
  pushProvider: MobilePushProvider;
  unifiedPushRegistered: boolean;
};

/**
 * Maps this device's push reading to the shared `DevicePushState`. The push device sync job
 * registers this device with no prompt once that is possible, so `can_request` and `blocked`
 * describe only the system notification permission. A Unified Push build with no registration
 * reads `unsupported`: no prompt can change it.
 */
export const resolveDevicePushState = ({
  fcmPermission,
  pushProvider,
  unifiedPushRegistered,
}: DevicePushReading): DevicePushState => {
  if (unifiedPushRegistered) {
    return 'enabled';
  }
  if (pushProvider !== 'fcm') {
    return 'unsupported';
  }
  if (fcmPermission.granted) {
    return 'enabled';
  }
  return fcmPermission.canAskAgain ? 'can_request' : 'blocked';
};
