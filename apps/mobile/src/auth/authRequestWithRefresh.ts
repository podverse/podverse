import type { ApiRequestService } from '@podverse/helpers-requests';

import { createMobileApiRequestService } from './mobileApi';

type AuthRequestDeps = {
  accessToken: string | null;
  clearSession: () => Promise<void>;
  refreshToken: string | null;
  setTokens: (params: { accessToken: string; refreshToken: string }) => Promise<void>;
};

type ErrorWithResponse = {
  response?: {
    data?: unknown;
    status?: unknown;
  };
};

let inFlightRefresh: Promise<string | null> | null = null;

const getErrorStatusCode = (error: unknown): number | null => {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const response = Reflect.get(error, 'response');
  if (typeof response !== 'object' || response === null) {
    return null;
  }

  const status = Reflect.get(response, 'status');
  if (typeof status !== 'number') {
    return null;
  }

  return status;
};

const getErrorCode = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const response = Reflect.get(error, 'response');
  if (typeof response !== 'object' || response === null) {
    return null;
  }

  const data = Reflect.get(response, 'data');
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const code = Reflect.get(data, 'code');
  if (typeof code !== 'string') {
    return null;
  }

  return code;
};

const isUnauthorizedError = (error: unknown): error is ErrorWithResponse => {
  return getErrorStatusCode(error) === 401;
};

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
      await clearSession();
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
      const errorCode = getErrorCode(error);
      if (isUnauthorizedError(error) || errorCode === 'refresh_token_reuse_detected') {
        await clearSession();
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
    if (!isUnauthorizedError(error)) {
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
