import { getErrorResponseStatus } from '@podverse/helpers/error';
import type { ApiRequestService } from '@podverse/helpers-requests';
import { parseAuthSessionEndedError } from '@podverse/helpers-requests';

import type { RequestOutcome } from '../net/connectivity';
import { reportNetworkOutcome } from '../net/connectivity';
import { isOfflineModeEnabled, OfflineModeEnabledError } from '../prefs/offlineMode';
import { classifySyncError } from '../sync/syncErrorClassification';
import type { ClearSession } from './forcedLogoutNotice';
import { createMobileApiRequestService } from './mobileApi';

export type AuthRequestDeps = {
  accessToken: string | null;
  clearSession: ClearSession;
  refreshToken: string | null;
  setTokens: (params: { accessToken: string; refreshToken: string }) => Promise<void>;
};

let inFlightRefresh: Promise<string | null> | null = null;

/**
 * Refresh an access token this long before `exp`. A request that leaves the device inside the
 * window can still be in flight when the server starts refusing it.
 */
const ACCESS_TOKEN_REFRESH_SKEW_MS = 60_000;

type GenerationStampedToken = {
  token: string;
  generation: number;
};

/**
 * Newest access token from login, hydrate, or refresh. It may be published before SecureStore
 * holds it, so a request already in flight can use it; the server does not rotation-check access
 * tokens, so an unsaved one is harmless. A job that captured `deps.accessToken` at the start still
 * sends this one once it is newer.
 */
let publishedAccessToken: GenerationStampedToken | null = null;

/**
 * The refresh token SecureStore most recently confirmed holding. Every refresh sends this one,
 * whichever caller starts it, so the server only ever sees its current or previous refresh token.
 * A refresh token from a response becomes eligible only after its SecureStore write resolves. A
 * refresh token held in React state or a background job's deps is a fallback for when nothing has
 * been saved under this generation.
 */
let savedRefreshToken: GenerationStampedToken | null = null;

/**
 * Advances when a session ends. A refresh that started under an older generation must not write
 * tokens after sign-out — that would sign the user back in and re-fire every effect keyed on
 * `accessToken`.
 */
let authSessionGeneration = 0;

const stampWithGeneration = (token: string): GenerationStampedToken => ({
  token,
  generation: authSessionGeneration,
});

const readForCurrentGeneration = (stamped: GenerationStampedToken | null): string | null => {
  if (stamped === null || stamped.generation !== authSessionGeneration || stamped.token === '') {
    return null;
  }
  return stamped.token;
};

/** Current auth session generation. Captured before a refresh awaits the network. */
export const getAuthSessionGeneration = (): number => authSessionGeneration;

/**
 * Call from `clearSession` before any await. Every concurrent clear bumps once; a refresh that
 * started earlier sees the mismatch and skips `setTokens`. Both published tokens belong to the
 * ended session and are dropped.
 */
export const advanceAuthSessionGeneration = (): void => {
  authSessionGeneration += 1;
  publishedAccessToken = null;
  savedRefreshToken = null;
};

/** Publish an access token for the current generation. It does not need to be saved yet. */
export const rememberAccessToken = (accessToken: string): void => {
  publishedAccessToken = stampWithGeneration(accessToken);
};

/**
 * Call once the SecureStore write of `refreshToken` has resolved, and only when the session
 * generation is the one the write started under. From then on every refresh sends this token.
 */
export const rememberSavedCredentials = (accessToken: string, refreshToken: string): void => {
  rememberAccessToken(accessToken);
  savedRefreshToken = stampWithGeneration(refreshToken);
};

/**
 * Publish tokens just read from SecureStore. A refresh that finished while the read was in flight
 * already published a newer pair, so a saved refresh token for this generation is kept, and so is
 * an access token already published for it.
 */
export const adoptStoredCredentials = (accessToken: string, refreshToken: string): void => {
  if (readForCurrentGeneration(savedRefreshToken) !== null) {
    return;
  }
  if (readForCurrentGeneration(publishedAccessToken) === null) {
    rememberAccessToken(accessToken);
  }
  savedRefreshToken = stampWithGeneration(refreshToken);
};

/**
 * Seconds-since-epoch `exp` from a JWT payload, or null when the token has no readable `exp`.
 * The signature is not checked; the server still verifies the token it receives.
 */
const readAccessTokenExpMs = (accessToken: string): number | null => {
  const segments = accessToken.split('.');
  const payloadSegment = segments[1];
  if (segments.length < 2 || payloadSegment === undefined || payloadSegment === '') {
    return null;
  }

  try {
    const json = decodeBase64Url(payloadSegment);
    const payload: unknown = JSON.parse(json);
    if (payload === null || typeof payload !== 'object' || !('exp' in payload)) {
      return null;
    }
    const exp = payload.exp;
    if (typeof exp !== 'number' || !Number.isFinite(exp)) {
      return null;
    }
    return exp * 1000;
  } catch {
    return null;
  }
};

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** JWT payloads are ASCII JSON. `exp` stays readable without a UTF-8 decode. */
const decodeBase64Url = (segment: string): string => {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const base64 = normalized + '='.repeat(padLength);
  const bytes: number[] = [];

  for (let index = 0; index < base64.length; index += 4) {
    const c0 = base64.charAt(index);
    const c1 = base64.charAt(index + 1);
    const c2 = base64.charAt(index + 2);
    const c3 = base64.charAt(index + 3);
    const a = BASE64_ALPHABET.indexOf(c0);
    const b = BASE64_ALPHABET.indexOf(c1);
    const c = c2 === '=' ? 0 : BASE64_ALPHABET.indexOf(c2);
    const d = c3 === '=' ? 0 : BASE64_ALPHABET.indexOf(c3);
    if (a < 0 || b < 0 || c < 0 || d < 0) {
      throw new Error('Invalid base64url');
    }
    bytes.push((a << 2) | (b >> 4));
    if (c2 !== '=') {
      bytes.push(((b & 15) << 4) | (c >> 2));
    }
    if (c3 !== '=') {
      bytes.push(((c & 3) << 6) | d);
    }
  }

  return String.fromCharCode(...bytes);
};

const accessTokenIsUsable = (accessToken: string | null, nowMs: number): boolean => {
  if (accessToken === null || accessToken === '') {
    return false;
  }
  const expMs = readAccessTokenExpMs(accessToken);
  if (expMs === null) {
    return false;
  }
  return expMs - ACCESS_TOKEN_REFRESH_SKEW_MS > nowMs;
};

type CredentialChoice = {
  accessToken: string | null;
  refreshToken: string | null;
};

/**
 * Prefer the published access token while it is still inside its lifetime, and the later `exp`
 * when the caller's is usable too. Otherwise keep the caller's access token. The refresh token is
 * the saved one whenever there is one; the caller's is only the fallback.
 */
const chooseCredentials = (deps: AuthRequestDeps, nowMs: number): CredentialChoice => {
  const refreshToken = readForCurrentGeneration(savedRefreshToken) ?? deps.refreshToken;
  const latestAccessToken = readForCurrentGeneration(publishedAccessToken);
  const latestUsable = accessTokenIsUsable(latestAccessToken, nowMs);
  const depsUsable = accessTokenIsUsable(deps.accessToken, nowMs);

  if (latestUsable && latestAccessToken !== null && depsUsable && deps.accessToken !== null) {
    const latestExpMs = readAccessTokenExpMs(latestAccessToken) ?? 0;
    const depsExpMs = readAccessTokenExpMs(deps.accessToken) ?? 0;
    return {
      accessToken: latestExpMs >= depsExpMs ? latestAccessToken : deps.accessToken,
      refreshToken,
    };
  }
  if (latestUsable) {
    return { accessToken: latestAccessToken, refreshToken };
  }
  return { accessToken: deps.accessToken, refreshToken };
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

/**
 * One refresh at a time for the whole JS runtime: foreground, background tasks, and car sync share
 * this module. It sends the saved refresh token, falling back to `refreshToken` only when nothing
 * is saved under this generation, and holds the in-flight promise until `setTokens` settles, so no
 * second refresh can start before the rotated token is saved.
 */
export const refreshAccessTokenSingleFlight = async ({
  clearSession,
  refreshToken,
  setTokens,
}: Omit<AuthRequestDeps, 'accessToken'>): Promise<string | null> => {
  const refreshTokenToSend = readForCurrentGeneration(savedRefreshToken) ?? refreshToken;
  if (refreshTokenToSend === null || refreshTokenToSend === '') {
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
        apiRequestService.reqAuthMobileRefresh(refreshTokenToSend)
      );

      // Sign-out won the race. Writing these tokens would flip status back to authenticated and
      // restart every accessToken-keyed effect.
      if (generationAtStart !== authSessionGeneration) {
        return null;
      }

      rememberAccessToken(refreshedTokens.access_token);
      try {
        await setTokens({
          accessToken: refreshedTokens.access_token,
          refreshToken: refreshedTokens.refresh_token,
        });
      } catch (saveError) {
        // SecureStore did not take the rotated pair, so the saved refresh token has not changed.
        // The server keeps accepting the one this refresh sent as its previous token, so the next
        // refresh sends it again and the session carries on.
        console.warn(
          '[auth] could not save refreshed tokens; the previous refresh token stays in use',
          saveError
        );
      }

      if (generationAtStart !== authSessionGeneration) {
        return null;
      }

      return refreshedTokens.access_token;
    } catch (error) {
      if (getErrorResponseStatus(error) === 401) {
        // The refusal belongs to the session that sent the token. Sign-out or a newer sign-in
        // already advanced the generation, and clearing again would end that newer session.
        if (generationAtStart !== authSessionGeneration) {
          return null;
        }

        // The server refused the refresh token and may say why. Every other failure rethrows
        // below, which is what keeps an offline device signed in.
        await clearSession('session_expired', parseAuthSessionEndedError(error));
        return null;
      }

      throw error;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
};

export class AccessTokenRefreshUnavailableError extends Error {
  constructor() {
    super('Mobile access token refresh did not yield a token');
    this.name = 'AccessTokenRefreshUnavailableError';
  }
}

/**
 * Return an access token that is still outside the skew window.
 *
 * When the stored or caller token is expired, unreadable, or inside the window, every caller
 * waits on one refresh and then receives that new access token. The request that needed it is
 * the one that proceeds.
 */
const ensureFreshAccessToken = async (
  deps: AuthRequestDeps
): Promise<{ accessToken: string | null; refreshToken: string | null; refreshed: boolean }> => {
  const nowMs = Date.now();
  const chosen = chooseCredentials(deps, nowMs);
  if (accessTokenIsUsable(chosen.accessToken, nowMs)) {
    return {
      accessToken: chosen.accessToken,
      refreshToken: chosen.refreshToken,
      refreshed: false,
    };
  }

  if (chosen.refreshToken === null || chosen.refreshToken === '') {
    // An expired bearer would be refused. Omit it so a route that does not require auth can
    // still answer.
    return { accessToken: null, refreshToken: null, refreshed: false };
  }

  const generationAtStart = authSessionGeneration;
  const refreshedAccessToken = await refreshAccessTokenSingleFlight({
    clearSession: deps.clearSession,
    refreshToken: chosen.refreshToken,
    setTokens: deps.setTokens,
  });

  if (generationAtStart !== authSessionGeneration || refreshedAccessToken === null) {
    throw new AccessTokenRefreshUnavailableError();
  }

  return { accessToken: refreshedAccessToken, refreshToken: chosen.refreshToken, refreshed: true };
};

const sendWithAccessToken = async <T>(
  accessToken: string | null,
  runRequest: (apiRequestService: ApiRequestService) => Promise<T>
): Promise<T> => {
  const apiRequestService = createMobileApiRequestService(accessToken);
  if (apiRequestService === null) {
    throw new Error('Mobile API base URL is not configured');
  }
  return withNetworkOutcomeReported(() => runRequest(apiRequestService));
};

/**
 * Start a refresh when the hydrated access token is already due, without awaiting it.
 * The signed-in shell paints from local data; the next bearer request joins this refresh.
 */
export const primeAccessTokenRefresh = (deps: AuthRequestDeps): void => {
  if (isOfflineModeEnabled() || deps.refreshToken === null || deps.refreshToken === '') {
    return;
  }

  void ensureFreshAccessToken(deps).catch((error: unknown) => {
    if (error instanceof AccessTokenRefreshUnavailableError) {
      return;
    }
    if (getErrorResponseStatus(error) !== undefined) {
      return;
    }
    console.warn('[auth] could not refresh the access token before the first request', error);
  });
};

/**
 * The refresh-once-then-clear rules for any bearer call. `send` receives the access token to use
 * and must reject with a value whose `response.status` is 401 when the server refuses it.
 */
export const runWithMobileAuthRefresh = async <T>(
  deps: AuthRequestDeps,
  send: (accessToken: string | null) => Promise<T>
): Promise<T> => {
  if (isOfflineModeEnabled()) {
    throw new OfflineModeEnabledError();
  }

  const prepared = await ensureFreshAccessToken(deps);

  try {
    return await withNetworkOutcomeReported(() => send(prepared.accessToken));
  } catch (error) {
    if (error instanceof OfflineModeEnabledError) {
      throw error;
    }
    if (getErrorResponseStatus(error) !== 401) {
      throw error;
    }

    if (prepared.refreshed) {
      // This send already used a token the gate just refreshed. Another refresh would loop.
      await deps.clearSession('session_expired', parseAuthSessionEndedError(error));
      throw error;
    }

    if (isOfflineModeEnabled()) {
      throw new OfflineModeEnabledError();
    }

    const refreshedAccessToken = await refreshAccessTokenSingleFlight({
      clearSession: deps.clearSession,
      refreshToken: prepared.refreshToken,
      setTokens: deps.setTokens,
    });

    if (refreshedAccessToken === null) {
      throw error;
    }

    try {
      return await withNetworkOutcomeReported(() => send(refreshedAccessToken));
    } catch (retryError) {
      // The server refused a token the client treated as fresh, and the replacement as well.
      // Ending the session is what stops every accessToken-keyed effect from firing again.
      if (getErrorResponseStatus(retryError) === 401) {
        await deps.clearSession('session_expired', parseAuthSessionEndedError(retryError));
      }
      throw retryError;
    }
  }
};

export const requestWithMobileAuthRefresh = async <T>(
  deps: AuthRequestDeps,
  runRequest: (apiRequestService: ApiRequestService) => Promise<T>
): Promise<T> =>
  runWithMobileAuthRefresh(deps, async (accessToken) => {
    const apiRequestService = createMobileApiRequestService(accessToken);
    if (apiRequestService === null) {
      throw new Error('Mobile API base URL is not configured');
    }
    return runRequest(apiRequestService);
  });

/**
 * Signed-out callers pass a null access token and must not refresh. An expired access token is
 * still a string, so it goes through the gate.
 */
export const requestWithMobileAuthRefreshIfSignedIn = async <T>(
  deps: AuthRequestDeps,
  runRequest: (apiRequestService: ApiRequestService) => Promise<T>
): Promise<T | null> => {
  if (deps.accessToken === null) {
    return null;
  }
  return requestWithMobileAuthRefresh(deps, runRequest);
};

/**
 * A public endpoint read with no bearer, for work that runs outside a signed-in screen (download
 * completion, background passes). Offline Mode still refuses it, and its outcome still feeds the
 * connectivity machine. It never refreshes or clears a session.
 */
export const requestWithoutMobileAuth = async <T>(
  runRequest: (apiRequestService: ApiRequestService) => Promise<T>
): Promise<T> => {
  if (isOfflineModeEnabled()) {
    throw new OfflineModeEnabledError();
  }
  return sendWithAccessToken(null, runRequest);
};
