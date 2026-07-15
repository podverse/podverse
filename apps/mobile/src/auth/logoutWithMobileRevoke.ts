import { createMobileApiRequestService } from './mobileApi';

type LogoutWithMobileRevokeParams = {
  clearSession: () => Promise<void>;
  refreshToken: string | null;
};

export const logoutWithMobileRevoke = async ({
  clearSession,
  refreshToken,
}: LogoutWithMobileRevokeParams): Promise<void> => {
  try {
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
