import type { DevicePushState } from '@podverse/helpers/notificationPush';

import { getMobileConfig } from '../config';
import { resolveDevicePushState } from './devicePushState';
import { getFcmPermissionStatus } from './fcmTransport';
import { isUnifiedPushRegisteredOnDevice } from './unifiedPushDeviceSync';

/** This device's push state, read fresh from the system permission and secure storage. */
export const readDevicePushState = async (): Promise<DevicePushState> => {
  const [fcmPermission, unifiedPushRegistered] = await Promise.all([
    getFcmPermissionStatus(),
    isUnifiedPushRegisteredOnDevice(),
  ]);
  return resolveDevicePushState({
    fcmPermission,
    pushProvider: getMobileConfig().pushProvider,
    unifiedPushRegistered,
  });
};
