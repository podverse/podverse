import type { AuthRequestDeps } from '../auth/authRequestWithRefresh';
import { getMobileConfig } from '../config';
import { registerFcmDeviceForAccount } from './fcmDeviceSync';
import { requestFcmPermissionAfterUserAction } from './fcmTransport';
import {
  isUnifiedPushRegisteredOnDevice,
  readUnifiedPushMode,
  registerUnifiedPushDeviceForAccount,
  releaseUnifiedPushForPushProvider,
} from './unifiedPushDeviceSync';

export type EnablePushOnThisDeviceResult =
  | { outcome: 'enabled' }
  | { outcome: 'denied' }
  | { outcome: 'not_registered' };

/**
 * Turns push on for this device after a person asked for it. An FCM build shows the system
 * permission prompt and registers on a grant; a Unified Push build registers its endpoint.
 * `denied` means the person refused, or the system would not ask; `readDevicePushState` tells
 * which. `not_registered` means permission is granted, or not needed, but registering this device
 * failed. Category push settings are left alone.
 */
export const enablePushOnThisDevice = async ({
  auth,
  locale,
}: {
  auth: AuthRequestDeps;
  locale: string;
}): Promise<EnablePushOnThisDeviceResult> => {
  if (getMobileConfig().pushProvider === 'fcm') {
    const permission = await requestFcmPermissionAfterUserAction();
    if (!permission.granted) {
      return { outcome: 'denied' };
    }
    try {
      const releaseUnifiedPush =
        (await readUnifiedPushMode()) === 'user' || (await isUnifiedPushRegisteredOnDevice());
      if (releaseUnifiedPush) {
        await releaseUnifiedPushForPushProvider({ auth });
      }
      await registerFcmDeviceForAccount({ auth, locale });
    } catch (error) {
      console.warn('Failed to register FCM device after enabling push', error);
      return { outcome: 'not_registered' };
    }
    return { outcome: 'enabled' };
  }

  try {
    await registerUnifiedPushDeviceForAccount({ auth, locale });
    return (await isUnifiedPushRegisteredOnDevice())
      ? { outcome: 'enabled' }
      : { outcome: 'not_registered' };
  } catch (error) {
    console.warn('Failed to register Unified Push device after enabling push', error);
    return { outcome: 'not_registered' };
  }
};
