import { getErrorResponseBodyCode, getErrorResponseStatus } from '@podverse/helpers/error';
import type { ApiRequestService } from '@podverse/helpers-requests';

import type { RequestOutcome } from '../net/connectivity';
import { reportNetworkOutcome } from '../net/connectivity';
import { isOfflineModeEnabled, OfflineModeEnabledError } from '../prefs/offlineMode';
import { classifySyncError } from '../sync/syncErrorClassification';
import type { SessionEndReason } from './forcedLogoutNotice';
import { createMobileApiRequestService } from './mobileApi';

export type AuthRequestDeps = {
  accessToken: string | null;
  clearSession: (reason: SessionEndReason) => Promise<void>;
  refreshToken: string | null;
  setTokens: (params: { accessToken: string; refreshToken: string }) => Promise<void>;
};

let inFlightRefresh: Promise<string | null> | null = null;

/**
 * Advances when a session ends. A refresh that started under an older generation must not write
 * tokens after sign-out — that would resurrect a dead session and re-fire every effect keyed on
 * `accessToken`.
 */
let authSessionGeneration = 0;

/** Current auth session generation. Captured before a refresh awaits the network. */
export const getAuthSessionGeneration = (): number => authSessionGeneration;

/**
 * Call from `clearSession` before any await. Every concurrent clear bumps once; a refresh that
 * started earlier sees the mismatch and skips `setTokens`.
 */
export const advanceAuthSessionGeneration = (): void => {
  authSessionGeneration += 1;
};

/**
 * What a failure proves about the network, or null when it proves nothing.
 *
 * `classifySyncError` does the sorting so the connectivity machine and the sync event log can never
 * disagree about the same error. Null matters: a bug in our own response handling is not evidence
 * the network works, and reporting it as such would talk the app out of an offline state it is
 * genuinely in.
 */
const networkOutcomeForError = (error: unknown): RequestOutcome | null => {
  // Offline Mode parking its own requests is a preference, not a reading of the network.
  if (error instanceof OfflineModeEnabledError) {
    return null;
  }

  const { isOffline, isServerUnreachable } = classifySyncError(error);
  if (isServerUnreachable) {
    return 'server_error';
  }
  if (isOffline) {
    return 'no_response';
  }
  return getErrorResponseStatus(error) === undefined ? null : 'reached_server';
};

/**
 * Run a request and tell the connectivity machine what it proved.
 *
 * Every request the app makes is a free reachability test, and nearly all of them come through
 * here, which is why automatic offline detection needs no polling of its own. An unhappy status
 * still counts as reaching the server — the question is whether anything answered, not whether the
 * answer was the one we wanted.
 */
const withNetworkOutcomeReported = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    const result = await run();
    reportNetworkOutcome('reached_server');
    return result;
  } catch (error) {
    const outcome = networkOutcomeForError(error);
    if (outcome !== null) {
      reportNetworkOutcome(outcome);
    }
    throw error;
  }
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

  const generationAtStart = authSessionGeneration;

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
      const refreshedTokens = await withNetworkOutcomeReported(() =>
        apiRequestService.reqAuthMobileRefresh(refreshToken)
      );

      // Sign-out (or another clear) won the race. Writing these tokens would flip status back to
      // authenticated and restart every accessToken-keyed effect.
      if (generationAtStart !== authSessionGeneration) {
        return null;
      }

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
  if (isOfflineModeEnabled()) {
    throw new OfflineModeEnabledError();
  }

  const initialApiRequestService = createMobileApiRequestService(deps.accessToken);
  if (initialApiRequestService === null) {
    throw new Error('Mobile API base URL is not configured');
  }

  try {
    return await withNetworkOutcomeReported(() => runRequest(initialApiRequestService));
  } catch (error) {
    if (error instanceof OfflineModeEnabledError) {
      throw error;
    }
    if (getErrorResponseStatus(error) !== 401) {
      throw error;
    }

    if (isOfflineModeEnabled()) {
      throw new OfflineModeEnabledError();
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

    try {
      return await withNetworkOutcomeReported(() => runRequest(retryApiRequestService));
    } catch (retryError) {
      // Refresh succeeded but the new access token is still refused. The credentials are dead —
      // typically the account no longer exists while the refresh JWT still verifies. Ending the
      // session here is what makes a 401 storm structurally impossible: accessToken becomes null
      // and every effect keyed on it bails out.
      if (getErrorResponseStatus(retryError) === 401) {
        await deps.clearSession('session_expired');
      }
      throw retryError;
    }
  }
};
