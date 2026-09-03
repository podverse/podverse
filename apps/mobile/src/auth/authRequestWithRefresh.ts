import { getErrorResponseBodyCode, getErrorResponseStatus } from '@podverse/helpers/error';
import type { ApiRequestService } from '@podverse/helpers-requests';

import type { SessionEndReason } from './forcedLogoutNotice';
import { createMobileApiRequestService } from './mobileApi';

export type AuthRequestDeps = {
  accessToken: string | null;
  clearSession: (reason: SessionEndReason) => Promise<void>;
  refreshToken: string | null;
  setTokens: (params: { accessToken: string; refreshToken: string }) => Promise<void>;
};

let inFlightRefresh: Promise<string | null> | null = null;

export const refreshAccessTokenSingleFlight = async ({
  clearSession,
  refreshToken,
  setTokens,
}: Omit<AuthRequestDeps, 'accessToken'>): Promise<string | null> => {
  if (refreshToken === null) {
    return null;
  }

  if (inFlightRefresh !== null) {
    return inFlightRefresh;
  }

  inFlightRefresh = (async () => {
    const apiRequestService = createMobileApiRequestService();
    if (apiRequestService === null) {
      // A missing base URL is a build/config fault, not the server rejecting these credentials.
      // Ending the session here would sign the user out over something they cannot act on, so the
      // refresh just fails and the caller handles it like any other unavailable-API error.
      console.warn('[auth] cannot refresh: mobile API base URL is not configured');
      return null;
    }

    try {
      // Use ApiRequestService methods — standalone reqAuthMobileRefresh is not
      // re-exported from @podverse/helpers-requests.
      const refreshedTokens = await apiRequestService.reqAuthMobileRefresh(refreshToken);
      await setTokens({
        accessToken: refreshedTokens.access_token,
        refreshToken: refreshedTokens.refresh_token,
      });

      return refreshedTokens.access_token;
    } catch (error) {
      const errorCode = getErrorResponseBodyCode(error);
      if (getErrorResponseStatus(error) === 401 || errorCode === 'refresh_token_reuse_detected') {
        // The server refused the refresh token itself, so these credentials are definitively dead.
        // Every other failure rethrows below, which is what keeps an offline device signed in.
        await clearSession('session_expired');
        return null;
      }

      throw error;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
};

export const requestWithMobileAuthRefresh = async <T>(
  deps: AuthRequestDeps,
  runRequest: (apiRequestService: ApiRequestService) => Promise<T>
): Promise<T> => {
  const initialApiRequestService = createMobileApiRequestService(deps.accessToken);
  if (initialApiRequestService === null) {
    throw new Error('Mobile API base URL is not configured');
  }

  try {
    return await runRequest(initialApiRequestService);
  } catch (error) {
    if (getErrorResponseStatus(error) !== 401) {
      throw error;
    }

    const refreshedAccessToken = await refreshAccessTokenSingleFlight({
      clearSession: deps.clearSession,
      refreshToken: deps.refreshToken,
      setTokens: deps.setTokens,
    });

    if (refreshedAccessToken === null) {
      throw error;
    }

    const retryApiRequestService = createMobileApiRequestService(refreshedAccessToken);
    if (retryApiRequestService === null) {
      throw error;
    }

    return runRequest(retryApiRequestService);
  }
};
