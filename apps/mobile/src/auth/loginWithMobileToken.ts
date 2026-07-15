import { getErrorStatusCode } from '../lib/httpError';
import { createMobileApiRequestService } from './mobileApi';

type LoginWithMobileTokenParams = {
  email: string;
  password: string;
  setTokens: (params: { accessToken: string; refreshToken: string }) => Promise<void>;
};

type LoginWithMobileTokenResult =
  | {
      accessToken: string;
      ok: true;
      refreshToken: string;
    }
  | { error: 'invalid_credentials' | 'mobile_api_not_configured'; ok: false };

export const loginWithMobileToken = async ({
  email,
  password,
  setTokens,
}: LoginWithMobileTokenParams): Promise<LoginWithMobileTokenResult> => {
  const apiRequestService = createMobileApiRequestService();
  if (apiRequestService === null) {
    return { error: 'mobile_api_not_configured', ok: false };
  }

  try {
    // Use ApiRequestService methods — standalone reqAuthMobileToken is not re-exported
    // from @podverse/helpers-requests (barrel only exports the class).
    const mobileToken = await apiRequestService.reqAuthMobileToken({ email, password });
    await setTokens({
      accessToken: mobileToken.access_token,
      refreshToken: mobileToken.refresh_token,
    });

    return {
      accessToken: mobileToken.access_token,
      ok: true,
      refreshToken: mobileToken.refresh_token,
    };
  } catch (error) {
    if (getErrorStatusCode(error) === 401) {
      return { error: 'invalid_credentials', ok: false };
    }

    throw error;
  }
};
