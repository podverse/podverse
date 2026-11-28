import {
  ERROR_MESSAGES,
  getErrorResponseBodyMessage,
  getErrorResponseStatus,
} from '@podverse/helpers/error';

import { createMobileApiRequestService } from './mobileApi';
import { readMobileSessionDeviceLabel } from './mobileSessionDeviceLabel.read';

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
  | {
      error: 'account_not_verified' | 'invalid_credentials' | 'mobile_api_not_configured';
      ok: false;
    }
  | {
      challengeToken?: string;
      error: 'second_factor';
      ok: false;
      setupToken?: string;
      step: 'code' | 'setup';
    };

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
    const mobileToken = await apiRequestService.reqAuthMobileToken({
      email,
      password,
      device_label: readMobileSessionDeviceLabel() ?? undefined,
    });
    if (mobileToken.step === 'setup' && typeof mobileToken.setupToken === 'string') {
      return {
        error: 'second_factor',
        ok: false,
        setupToken: mobileToken.setupToken,
        step: 'setup',
      };
    }
    if (mobileToken.step === 'code' && typeof mobileToken.challengeToken === 'string') {
      return {
        challengeToken: mobileToken.challengeToken,
        error: 'second_factor',
        ok: false,
        step: 'code',
      };
    }
    if (
      typeof mobileToken.access_token !== 'string' ||
      typeof mobileToken.refresh_token !== 'string'
    ) {
      return { error: 'invalid_credentials', ok: false };
    }
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
    const status = getErrorResponseStatus(error);
    if (status === 401) {
      return { error: 'invalid_credentials', ok: false };
    }

    if (
      status === 403 &&
      getErrorResponseBodyMessage(error) === ERROR_MESSAGES.ACCOUNT.NOT_VERIFIED
    ) {
      return { error: 'account_not_verified', ok: false };
    }

    throw error;
  }
};
