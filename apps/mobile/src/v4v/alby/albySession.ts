/**
 * Device-local Alby login. PKCE runs in the system browser. Tokens stay in the secure store
 * on the phone and are not sent to the Podverse API.
 */
import { isObjectLike } from '@podverse/helpers/guards';

import type { AlbyHttp } from './albyHttp';
import { AlbyProtocolError } from './albyHttp';
import type {
  AlbyClientConfig,
  AlbyInvoicePaymentResult,
  AlbyKeysendPayment,
  AlbyKeysendPaymentResult,
  AlbyTokenSet,
} from './albyProtocol';
import {
  buildAlbyAuthorizeUrl,
  createPkcePair,
  isAlbyExpiredAccessToken,
  parseAlbyOAuthRedirect,
  shouldRefreshAlbyAccessToken,
} from './albyProtocol';

/**
 * Tokens stay on the phone across Podverse sign-out because a signed-out listener sends boosts
 * with this wallet.
 */
export const ALBY_TOKENS_KEY = 'v4v.alby.tokens';
/** Last balance and address for the settings row. Not a secret. Tokens never go in this value. */
export const ALBY_DISPLAY_KEY = 'v4v.alby.display';
/** PKCE verifier and state for an authorize attempt that has not finished. */
export const ALBY_OAUTH_PENDING_KEY = 'v4v.alby.oauth_pending';

/** Enough bytes for a PKCE verifier and state after unbiased-byte rejection. */
const PKCE_RANDOM_BYTE_COUNT = 2048;

export type AlbyAccountSnapshot = {
  balanceSats: number | null;
  lightningAddress: string | null;
};

export type AlbyConnectResult =
  | { status: 'connected'; account: AlbyAccountSnapshot }
  | { status: 'cancelled' }
  | { status: 'not_configured' }
  | { status: 'failed' };

export type AlbyProviderErrorKind =
  'not_configured' | 'not_connected' | 'session_ended' | 'rejected' | 'transport';

export class AlbyProviderError extends Error {
  readonly kind: AlbyProviderErrorKind;
  readonly httpStatus: number | null;

  constructor(kind: AlbyProviderErrorKind, httpStatus: number | null, cause?: unknown) {
    super(kind, cause === undefined ? undefined : { cause });
    this.name = 'AlbyProviderError';
    this.kind = kind;
    this.httpStatus = httpStatus;
  }
}

class AlbyAccessPhaseError extends AlbyProviderError {
  readonly phase: 'refresh' | 'request';

  constructor(
    kind: 'rejected' | 'session_ended' | 'transport',
    httpStatus: number | null,
    phase: 'refresh' | 'request',
    cause?: unknown
  ) {
    super(kind, httpStatus, cause);
    this.name = 'AlbyProviderError';
    this.phase = phase;
  }
}

export type AlbySecureStore = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

export type AlbyBrowser = {
  maybeCompleteAuthSession: () => void;
  openAuthSessionAsync: (
    url: string,
    redirectUri: string
  ) => Promise<{ type: string; url?: string }>;
};

export type AlbySessionConfig = {
  clientId: string | null;
  authorizeUrl: string;
  apiBaseUrl: string;
  redirectUri: string;
};

export type AlbySessionDeps = {
  store: AlbySecureStore;
  browser: AlbyBrowser;
  randomBytes: (byteCount: number) => Promise<Uint8Array>;
  digestBase64: (verifier: string) => Promise<string>;
  http: AlbyHttp;
  now: () => number;
  readConfig: () => AlbySessionConfig;
};

type AlbyOAuthPending = {
  codeVerifier: string;
  state: string;
};

const emptyAccount = (): AlbyAccountSnapshot => {
  return { balanceSats: null, lightningAddress: null };
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return isObjectLike(value) && !Array.isArray(value);
};

const parseUnknown = (raw: string): unknown => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
};

const parseTokenSet = (raw: string): AlbyTokenSet | null => {
  const parsed = parseUnknown(raw);
  if (!isRecord(parsed)) {
    return null;
  }
  const { accessToken, refreshToken, accessTokenExpiresAtMs, scope } = parsed;
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    return null;
  }
  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    return null;
  }
  if (typeof accessTokenExpiresAtMs !== 'number' || !Number.isFinite(accessTokenExpiresAtMs)) {
    return null;
  }
  if (typeof scope !== 'string') {
    return null;
  }
  return { accessToken, refreshToken, accessTokenExpiresAtMs, scope };
};

const parseDisplay = (raw: string): AlbyAccountSnapshot | null => {
  const parsed = parseUnknown(raw);
  if (!isRecord(parsed)) {
    return null;
  }
  const { balanceSats, lightningAddress } = parsed;
  const balanceOk =
    balanceSats === null || (typeof balanceSats === 'number' && Number.isFinite(balanceSats));
  const addressOk = lightningAddress === null || typeof lightningAddress === 'string';
  if (!balanceOk || !addressOk) {
    return null;
  }
  return { balanceSats, lightningAddress };
};

const sameSnapshot = (
  left: AlbyAccountSnapshot | null,
  right: AlbyAccountSnapshot | null
): boolean => {
  if (left === null || right === null) {
    return left === right;
  }
  return left.balanceSats === right.balanceSats && left.lightningAddress === right.lightningAddress;
};

const toBase64Url = (value: string): string => {
  return value.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
};

const byteSource = (bytes: Uint8Array): (() => number) => {
  let offset = 0;
  return () => {
    const byte = bytes[offset];
    offset += 1;
    if (byte === undefined) {
      throw new Error('PKCE byte source exhausted');
    }
    return byte;
  };
};

const isExpiredAccessTokenError = (error: unknown): error is AlbyProtocolError => {
  return (
    error instanceof AlbyProtocolError &&
    error.kind === 'http' &&
    isAlbyExpiredAccessToken(error.httpStatus ?? 0, error.responseData)
  );
};

const isHttp401 = (error: unknown): error is AlbyProtocolError => {
  return error instanceof AlbyProtocolError && error.kind === 'http' && error.httpStatus === 401;
};

const isHttpClientError = (error: unknown): error is AlbyProtocolError => {
  return (
    error instanceof AlbyProtocolError &&
    error.kind === 'http' &&
    error.httpStatus !== null &&
    error.httpStatus >= 400 &&
    error.httpStatus < 500
  );
};

const isRequestTransport = (error: unknown): boolean => {
  return (
    error instanceof AlbyAccessPhaseError && error.phase === 'request' && error.kind === 'transport'
  );
};

const isRefreshTransport = (error: unknown): boolean => {
  return (
    error instanceof AlbyAccessPhaseError && error.phase === 'refresh' && error.kind === 'transport'
  );
};

const throwMappedRequest = (error: unknown): never => {
  if (error instanceof AlbyProviderError) {
    throw error;
  }
  if (error instanceof AlbyProtocolError && error.kind === 'invalid_request') {
    throw new AlbyAccessPhaseError('rejected', error.httpStatus, 'request', error);
  }
  const status = error instanceof AlbyProtocolError ? error.httpStatus : null;
  throw new AlbyAccessPhaseError('transport', status, 'request', error);
};

const keepFieldOnRequestTransport = (error: unknown): void => {
  if (isRequestTransport(error)) {
    return;
  }
  throw error;
};

export function createAlbySession(deps: AlbySessionDeps) {
  let snapshot: AlbyAccountSnapshot | null = null;
  const listeners = new Set<() => void>();
  let connectInFlight: Promise<AlbyConnectResult> | null = null;
  // A second refresh invalidates the Alby session, so overlapping callers share one refresh.
  let refreshInFlight: Promise<AlbyTokenSet> | null = null;

  const setSnapshot = (next: AlbyAccountSnapshot | null): void => {
    if (sameSnapshot(snapshot, next)) {
      return;
    }
    snapshot = next;
    for (const listener of [...listeners]) {
      listener();
    }
  };

  const writeJson = async (key: string, value: object): Promise<void> => {
    await deps.store.set(key, JSON.stringify(value));
  };

  const signOut = async (): Promise<void> => {
    await deps.store.delete(ALBY_TOKENS_KEY);
    await deps.store.delete(ALBY_DISPLAY_KEY);
    await deps.store.delete(ALBY_OAUTH_PENDING_KEY);
    setSnapshot(null);
  };

  const readTokens = async (): Promise<AlbyTokenSet | null> => {
    const raw = await deps.store.get(ALBY_TOKENS_KEY);
    if (raw === null) {
      return null;
    }
    const tokens = parseTokenSet(raw);
    if (tokens === null) {
      await signOut();
      return null;
    }
    return tokens;
  };

  const readDisplay = async (): Promise<AlbyAccountSnapshot | null> => {
    const raw = await deps.store.get(ALBY_DISPLAY_KEY);
    if (raw === null) {
      return null;
    }
    const display = parseDisplay(raw);
    if (display === null) {
      await deps.store.delete(ALBY_DISPLAY_KEY);
      return null;
    }
    return display;
  };

  const persistSnapshot = async (account: AlbyAccountSnapshot): Promise<AlbyAccountSnapshot> => {
    await writeJson(ALBY_DISPLAY_KEY, account);
    setSnapshot(account);
    if (snapshot === null) {
      return account;
    }
    return snapshot;
  };

  const performRefresh = async (current: AlbyTokenSet): Promise<AlbyTokenSet> => {
    try {
      const next = await deps.http.refreshAccessToken(current.refreshToken);
      await writeJson(ALBY_TOKENS_KEY, next);
      return next;
    } catch (error) {
      if (isHttpClientError(error)) {
        await signOut();
        throw new AlbyAccessPhaseError('session_ended', error.httpStatus, 'refresh', error);
      }
      const status = error instanceof AlbyProtocolError ? error.httpStatus : null;
      throw new AlbyAccessPhaseError('transport', status, 'refresh', error);
    }
  };

  const refreshTokens = (current: AlbyTokenSet): Promise<AlbyTokenSet> => {
    if (refreshInFlight !== null) {
      return refreshInFlight;
    }
    const run = performRefresh(current).finally(() => {
      refreshInFlight = null;
    });
    refreshInFlight = run;
    return run;
  };

  const withAccessToken = async <T>(run: (accessToken: string) => Promise<T>): Promise<T> => {
    const tokens = await readTokens();
    if (tokens === null) {
      throw new AlbyProviderError('not_connected', null);
    }
    let current = tokens;
    if (shouldRefreshAlbyAccessToken(current, deps.now())) {
      current = await refreshTokens(current);
    }
    try {
      return await run(current.accessToken);
    } catch (error) {
      if (!isExpiredAccessTokenError(error)) {
        return throwMappedRequest(error);
      }
      current = await refreshTokens(current);
      try {
        return await run(current.accessToken);
      } catch (retryError) {
        if (isHttp401(retryError)) {
          await signOut();
          throw new AlbyAccessPhaseError(
            'session_ended',
            retryError.httpStatus,
            'request',
            retryError
          );
        }
        return throwMappedRequest(retryError);
      }
    }
  };

  const refreshAlbyAccount = async (): Promise<AlbyAccountSnapshot> => {
    const tokens = await readTokens();
    if (tokens === null) {
      throw new AlbyProviderError('not_connected', null);
    }
    const previous = snapshot ?? (await readDisplay()) ?? emptyAccount();
    let balanceSats = previous.balanceSats;
    let lightningAddress = previous.lightningAddress;

    try {
      const summary = await withAccessToken((accessToken) =>
        deps.http.getAccountSummary(accessToken)
      );
      balanceSats = summary.balanceSats;
    } catch (error) {
      if (isRefreshTransport(error)) {
        throw error;
      }
      keepFieldOnRequestTransport(error);
    }

    try {
      const value = await withAccessToken((accessToken) => deps.http.getValue4Value(accessToken));
      lightningAddress = value.lightningAddress;
    } catch (error) {
      if (isRefreshTransport(error)) {
        await persistSnapshot({ balanceSats, lightningAddress });
        throw error;
      }
      keepFieldOnRequestTransport(error);
    }

    return persistSnapshot({ balanceSats, lightningAddress });
  };

  const deletePending = async (): Promise<void> => {
    await deps.store.delete(ALBY_OAUTH_PENDING_KEY);
  };

  const startConnect = async (
    clientConfig: AlbyClientConfig
  ): Promise<{ pair: AlbyOAuthPending; authorizeUrl: string } | null> => {
    try {
      const nextByte = byteSource(await deps.randomBytes(PKCE_RANDOM_BYTE_COUNT));
      const pair = createPkcePair(nextByte);
      await writeJson(ALBY_OAUTH_PENDING_KEY, {
        codeVerifier: pair.codeVerifier,
        state: pair.state,
      });
      const digest = await deps.digestBase64(pair.codeVerifier);
      const authorizeUrl = buildAlbyAuthorizeUrl(clientConfig, pair, toBase64Url(digest));
      return { pair, authorizeUrl };
    } catch {
      await deletePending();
      return null;
    }
  };

  const finishConnect = async (tokenSet: AlbyTokenSet): Promise<AlbyConnectResult> => {
    await writeJson(ALBY_TOKENS_KEY, tokenSet);
    await deletePending();
    try {
      const account = await refreshAlbyAccount();
      return { status: 'connected', account };
    } catch (error) {
      if (error instanceof AlbyProviderError && error.kind === 'session_ended') {
        return { status: 'failed' };
      }
      if (error instanceof AlbyProviderError && error.kind === 'transport') {
        if (snapshot !== null) {
          return { status: 'connected', account: snapshot };
        }
        const account = await persistSnapshot(emptyAccount());
        return { status: 'connected', account };
      }
      await signOut();
      return { status: 'failed' };
    }
  };

  const runConnect = async (): Promise<AlbyConnectResult> => {
    const alby = deps.readConfig();
    if (alby.clientId === null) {
      return { status: 'not_configured' };
    }
    const clientConfig: AlbyClientConfig = {
      clientId: alby.clientId,
      authorizeUrl: alby.authorizeUrl,
      apiBaseUrl: alby.apiBaseUrl,
      redirectUri: alby.redirectUri,
    };
    const started = await startConnect(clientConfig);
    if (started === null) {
      return { status: 'failed' };
    }

    let result: { type: string; url?: string };
    try {
      deps.browser.maybeCompleteAuthSession();
      result = await deps.browser.openAuthSessionAsync(
        started.authorizeUrl,
        clientConfig.redirectUri
      );
    } catch {
      await deletePending();
      return { status: 'failed' };
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      await deletePending();
      return { status: 'cancelled' };
    }
    if (result.type !== 'success' || typeof result.url !== 'string' || result.url.length === 0) {
      await deletePending();
      return { status: 'failed' };
    }

    const parsed = parseAlbyOAuthRedirect(result.url, started.pair.state);
    if ('error' in parsed) {
      await deletePending();
      return { status: 'failed' };
    }

    try {
      const tokenSet = await deps.http.exchangeAuthorizationCode({
        code: parsed.code,
        codeVerifier: started.pair.codeVerifier,
      });
      return finishConnect(tokenSet);
    } catch {
      await signOut();
      return { status: 'failed' };
    }
  };

  const connectAlby = (): Promise<AlbyConnectResult> => {
    if (connectInFlight !== null) {
      return connectInFlight;
    }
    const run = runConnect().finally(() => {
      connectInFlight = null;
    });
    connectInFlight = run;
    return run;
  };

  const loadAlbyConnection = async (): Promise<void> => {
    try {
      const rawTokens = await deps.store.get(ALBY_TOKENS_KEY);
      if (rawTokens === null) {
        await deps.store.delete(ALBY_DISPLAY_KEY);
        setSnapshot(null);
        return;
      }
      const tokens = parseTokenSet(rawTokens);
      if (tokens === null) {
        await signOut();
        return;
      }
      const rawDisplay = await deps.store.get(ALBY_DISPLAY_KEY);
      if (rawDisplay === null) {
        setSnapshot(emptyAccount());
        return;
      }
      const display = parseDisplay(rawDisplay);
      if (display === null) {
        await deps.store.delete(ALBY_DISPLAY_KEY);
        setSnapshot(emptyAccount());
        return;
      }
      setSnapshot(display);
    } catch {
      // The store could not be opened. Leave the in-memory snapshot as it is.
    }
  };

  return {
    isAlbyConfigured: (): boolean => deps.readConfig().clientId !== null,
    getAlbyAccountSnapshot: (): AlbyAccountSnapshot | null => snapshot,
    subscribeAlbyConnection: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    loadAlbyConnection,
    connectAlby,
    disconnectAlby: signOut,
    refreshAlbyAccount,
    sendAlbyKeysends: (
      payments: readonly AlbyKeysendPayment[]
    ): Promise<readonly AlbyKeysendPaymentResult[]> => {
      return withAccessToken((accessToken) => deps.http.sendKeysends(accessToken, payments));
    },
    payAlbyInvoice: (invoice: string): Promise<AlbyInvoicePaymentResult> => {
      return withAccessToken((accessToken) => deps.http.payInvoice(accessToken, invoice));
    },
  };
}
