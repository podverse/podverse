import { getMobileConfig } from '../config';
import { unregisterFcmDeviceForAccount } from '../push/fcmDeviceSync';
import { unregisterUnifiedPushDeviceForAccount } from '../push/unifiedPushDeviceSync';
import { createMobileApiRequestService } from './mobileApi';

type LogoutWithMobileRevokeParams = {
  accessToken: string | null;
  clearSession: () => Promise<void>;
  refreshToken: string | null;
};

export const logoutWithMobileRevoke = async ({
  accessToken,
  clearSession,
  refreshToken,
}: LogoutWithMobileRevokeParams): Promise<void> => {
  try {
    try {
      const pushProvider = getMobileConfig().pushProvider;
      if (pushProvider === 'fcm') {
        await unregisterFcmDeviceForAccount({ accessToken });
      } else if (pushProvider === 'unifiedpush') {
        await unregisterUnifiedPushDeviceForAccount({ accessToken });
      }
    } catch (error) {
      console.warn('Failed to deregister push device during logout', error);
    }

    if (refreshToken !== null) {
      const apiRequestService = createMobileApiRequestService();
      if (apiRequestService !== null) {
        // Use ApiRequestService methods — standalone reqAuthMobileRevoke is not
        // re-exported from @podverse/helpers-requests.
        await apiRequestService.reqAuthMobileRevoke(refreshToken);
      }
    }
  } finally {
    await clearSession();
  }
};
