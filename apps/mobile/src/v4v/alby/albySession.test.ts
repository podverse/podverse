import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => {
  return { Platform: { OS: 'ios' } };
});

import { isObjectLike } from '@podverse/helpers/guards';

import {
  getAlbyApiBaseUrlFromEnv,
  getAlbyOAuthAuthorizeUrlFromEnv,
  getAlbyOAuthClientIdFromEnv,
  getAlbyOAuthRedirectUriFromEnv,
} from '../../config/env';
import type { AlbyHttp } from './albyHttp';
import { AlbyProtocolError } from './albyHttp';
import type { AlbyInvoicePaymentResult, AlbyTokenSet } from './albyProtocol';
import type { AlbyAccountSnapshot, AlbySecureStore } from './albySession';
import {
  ALBY_DISPLAY_KEY,
  ALBY_OAUTH_PENDING_KEY,
  ALBY_TOKENS_KEY,
  AlbyProviderError,
  createAlbySession,
} from './albySession';

const NOW = 1_700_000_000_000;

const paid: AlbyInvoicePaymentResult = {
  amountSats: 10,
  destination: 'dest',
  feeSats: 1,
  paymentHash: 'hash',
  paymentPreimage: 'preimage',
};

const token = (expiresAtMs: number, accessToken = 'old-access'): AlbyTokenSet => {
  return {
    accessToken,
    refreshToken: 'old-refresh',
    accessTokenExpiresAtMs: expiresAtMs,
    scope: 'account:read balance:read payments:send',
  };
};

const freshToken = (): AlbyTokenSet => token(NOW + 3_600_000);
const expiredToken = (): AlbyTokenSet => token(NOW - 1);

type BrowserMode = 'match' | 'mismatch' | 'cancel' | 'dismiss';

type PendingOAuth = {
  codeVerifier: string;
  state: string;
};

const memoryStore = (): { memory: Map<string, string>; store: AlbySecureStore } => {
  const memory = new Map<string, string>();
  return {
    memory,
    store: {
      get: async (key) => memory.get(key) ?? null,
      set: async (key, value) => {
        memory.set(key, value);
      },
      delete: async (key) => {
        memory.delete(key);
      },
    },
  };
};

const readPending = (memory: Map<string, string>): PendingOAuth | null => {
  const raw = memory.get(ALBY_OAUTH_PENDING_KEY);
  if (typeof raw !== 'string') {
    return null;
  }
  const parsed: unknown = JSON.parse(raw);
  if (
    !isObjectLike(parsed) ||
    Array.isArray(parsed) ||
    typeof parsed.codeVerifier !== 'string' ||
    typeof parsed.state !== 'string'
  ) {
    return null;
  }
  return { codeVerifier: parsed.codeVerifier, state: parsed.state };
};

const deferred = <T>(): { promise: Promise<T>; resolve: (value: T) => void } => {
  let resolvePromise: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: (value) => {
      resolvePromise(value);
    },
  };
};

const createSession = (options?: {
  clientId?: string | null;
  mode?: BrowserMode;
  http?: Partial<AlbyHttp>;
}) => {
  const { memory, store } = memoryStore();
  const events: string[] = [];
  const opens: string[] = [];
  const pendingAtOpen: Array<PendingOAuth | null> = [];
  const digested: string[] = [];
  let mode: BrowserMode = options?.mode ?? 'match';
  const clientId = options?.clientId === undefined ? 'client-id' : options.clientId;

  const exchangeAuthorizationCode = vi.fn(async () => freshToken());
  const refreshAccessToken = vi.fn(async () => freshToken());
  const getAccountSummary = vi.fn(async () => ({ balanceSats: 42 }));
  const getValue4Value = vi.fn(async () => ({ lightningAddress: 'me@getalby.com' }));
  const sendKeysends = vi.fn(async () => []);
  const payInvoice = vi.fn(async () => paid);

  const http: AlbyHttp = {
    exchangeAuthorizationCode,
    refreshAccessToken,
    getAccountSummary,
    getValue4Value,
    sendKeysends,
    payInvoice,
    ...options?.http,
  };

  const session = createAlbySession({
    store,
    browser: {
      maybeCompleteAuthSession: () => {
        events.push('complete');
      },
      openAuthSessionAsync: async (url) => {
        events.push('open');
        opens.push(url);
        const pending = readPending(memory);
        pendingAtOpen.push(pending);
        if (mode === 'cancel' || mode === 'dismiss') {
          return { type: mode };
        }
        const state = mode === 'mismatch' || pending === null ? 'nope' : pending.state;
        return {
          type: 'success',
          url: `podverse-next://alby/callback?code=auth-code&state=${encodeURIComponent(state)}`,
        };
      },
    },
    randomBytes: async (count) => new Uint8Array(count).fill(7),
    digestBase64: async (verifier) => {
      digested.push(verifier);
      return 'abc+def/ghi=';
    },
    http,
    now: () => NOW,
    readConfig: () => ({
      clientId,
      authorizeUrl: 'https://getalby.com/oauth',
      apiBaseUrl: 'https://api.getalby.com',
      redirectUri: 'podverse-next://alby/callback',
    }),
  });

  return {
    session,
    memory,
    events,
    opens,
    pendingAtOpen,
    digested,
    exchangeAuthorizationCode,
    refreshAccessToken,
    getAccountSummary,
    getValue4Value,
    payInvoice,
    setMode: (next: BrowserMode) => {
      mode = next;
    },
  };
};

const seedTokens = (memory: Map<string, string>, value: AlbyTokenSet): void => {
  memory.set(ALBY_TOKENS_KEY, JSON.stringify(value));
};

const expectProviderError = async (
  run: () => Promise<unknown>,
  expected: { kind: AlbyProviderError['kind']; httpStatus: number | null }
): Promise<void> => {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(AlbyProviderError);
    if (!(error instanceof AlbyProviderError)) {
      throw new Error('expected AlbyProviderError', { cause: error });
    }
    expect(error.kind).toBe(expected.kind);
    expect(error.httpStatus).toBe(expected.httpStatus);
    return;
  }
  throw new Error('expected AlbyProviderError');
};

const pendingAt = (
  pendingAtOpen: ReadonlyArray<PendingOAuth | null>,
  index: number
): PendingOAuth => {
  const pending = pendingAtOpen[index];
  if (pending === null || pending === undefined) {
    throw new Error('verifier was not stored before the browser opened');
  }
  return pending;
};

describe('connectAlby', () => {
  it('persists the verifier before opening the browser and exchanges only when state matches', async () => {
    const harness = createSession({ mode: 'mismatch' });

    await expect(harness.session.connectAlby()).resolves.toEqual({ status: 'failed' });
    expect(harness.exchangeAuthorizationCode).not.toHaveBeenCalled();
    expect(harness.memory.has(ALBY_OAUTH_PENDING_KEY)).toBe(false);
    expect(pendingAt(harness.pendingAtOpen, 0).codeVerifier.length).toBeGreaterThan(0);

    harness.setMode('match');
    await expect(harness.session.connectAlby()).resolves.toEqual({
      status: 'connected',
      account: { balanceSats: 42, lightningAddress: 'me@getalby.com' },
    });

    const pending = pendingAt(harness.pendingAtOpen, 1);
    expect(harness.exchangeAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(harness.exchangeAuthorizationCode).toHaveBeenCalledWith({
      code: 'auth-code',
      codeVerifier: pending.codeVerifier,
    });
    expect(harness.digested[1]).toBe(pending.codeVerifier);
    expect(harness.events).toEqual(['complete', 'open', 'complete', 'open']);
    const matchUrl = harness.opens[1];
    if (typeof matchUrl !== 'string') {
      throw new Error('browser was not opened');
    }
    expect(new URL(matchUrl).searchParams.get('code_challenge')).toBe('abc-def_ghi');
    expect(harness.session.isAlbyConfigured()).toBe(true);
    expect(harness.session.getAlbyAccountSnapshot()).toEqual({
      balanceSats: 42,
      lightningAddress: 'me@getalby.com',
    });
    expect(harness.memory.has(ALBY_OAUTH_PENDING_KEY)).toBe(false);
    expect(harness.memory.get(ALBY_TOKENS_KEY)).toContain('accessToken');
    const displayRaw = harness.memory.get(ALBY_DISPLAY_KEY);
    expect(displayRaw).toBe(
      JSON.stringify({ balanceSats: 42, lightningAddress: 'me@getalby.com' })
    );
    expect(displayRaw).not.toContain('accessToken');
  });

  it.each(['cancel', 'dismiss'] as const)(
    'returns cancelled without an exchange when the browser result is %s',
    async (mode) => {
      const harness = createSession({ mode });
      await expect(harness.session.connectAlby()).resolves.toEqual({ status: 'cancelled' });
      expect(harness.exchangeAuthorizationCode).not.toHaveBeenCalled();
      expect(harness.memory.has(ALBY_OAUTH_PENDING_KEY)).toBe(false);
      expect(pendingAt(harness.pendingAtOpen, 0).codeVerifier.length).toBeGreaterThan(0);
    }
  );

  it('does not open the browser when Alby is not configured', async () => {
    const harness = createSession({ clientId: null });
    await expect(harness.session.connectAlby()).resolves.toEqual({ status: 'not_configured' });
    expect(harness.opens).toEqual([]);
    expect(harness.events).toEqual([]);
    expect(harness.session.isAlbyConfigured()).toBe(false);
  });

  it('stays connected when account refresh fails after the code exchange', async () => {
    const exchangeAuthorizationCode = vi.fn(async () => expiredToken());
    const refreshAccessToken = vi.fn(async () => {
      throw new AlbyProtocolError('http', 503, null);
    });
    const harness = createSession({ http: { exchangeAuthorizationCode, refreshAccessToken } });

    await expect(harness.session.connectAlby()).resolves.toEqual({
      status: 'connected',
      account: { balanceSats: null, lightningAddress: null },
    });
    expect(harness.session.getAlbyAccountSnapshot()).toEqual({
      balanceSats: null,
      lightningAddress: null,
    });
    expect(harness.memory.has(ALBY_TOKENS_KEY)).toBe(true);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('returns failed when the session ends during account refresh', async () => {
    const exchangeAuthorizationCode = vi.fn(async () => expiredToken());
    const refreshAccessToken = vi.fn(async () => {
      throw new AlbyProtocolError('http', 400, { error: 'invalid_grant' });
    });
    const harness = createSession({ http: { exchangeAuthorizationCode, refreshAccessToken } });

    await expect(harness.session.connectAlby()).resolves.toEqual({ status: 'failed' });
    expect(harness.memory.has(ALBY_TOKENS_KEY)).toBe(false);
    expect(harness.session.getAlbyAccountSnapshot()).toBeNull();
  });
});

describe('access token refresh', () => {
  it('shares one HTTP refresh across overlapping callers', async () => {
    const gate = deferred<AlbyTokenSet>();
    const started = deferred<void>();
    const refreshTokensSeen: string[] = [];
    const payCalls: string[] = [];
    const refreshAccessToken = vi.fn((refreshToken: string) => {
      refreshTokensSeen.push(refreshToken);
      started.resolve();
      return gate.promise;
    });
    const payInvoice = vi.fn(async (accessToken: string, invoice: string) => {
      payCalls.push(`${accessToken}:${invoice}`);
      return paid;
    });
    const harness = createSession({ http: { refreshAccessToken, payInvoice } });
    seedTokens(harness.memory, expiredToken());

    const first = harness.session.payAlbyInvoice('lnbc1');
    const second = harness.session.payAlbyInvoice('lnbc2');
    await started.promise;

    expect(refreshTokensSeen).toEqual(['old-refresh']);
    expect(payCalls).toEqual([]);
    gate.resolve(token(NOW + 3_600_000, 'new-access'));
    await expect(first).resolves.toEqual(paid);
    await expect(second).resolves.toEqual(paid);
    expect(refreshTokensSeen).toEqual(['old-refresh']);
    expect(payCalls).toEqual(['new-access:lnbc1', 'new-access:lnbc2']);
  });

  it('refreshes once after an expired access token and returns the second payment', async () => {
    const refreshAccessToken = vi.fn(async () => token(NOW + 3_600_000, 'new-access'));
    const payInvoice = vi.fn(async () => paid);
    payInvoice
      .mockRejectedValueOnce(new AlbyProtocolError('http', 401, { error: 'expired access token' }))
      .mockResolvedValueOnce(paid);
    const harness = createSession({ http: { refreshAccessToken, payInvoice } });
    seedTokens(harness.memory, freshToken());

    await expect(harness.session.payAlbyInvoice('lnbc1')).resolves.toEqual(paid);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(payInvoice).toHaveBeenCalledTimes(2);
    expect(payInvoice).toHaveBeenNthCalledWith(1, 'old-access', 'lnbc1');
    expect(payInvoice).toHaveBeenNthCalledWith(2, 'new-access', 'lnbc1');
  });

  it('clears tokens when the retried payment is 401', async () => {
    const refreshAccessToken = vi.fn(async () => token(NOW + 3_600_000, 'new-access'));
    const payInvoice = vi.fn(async () => paid);
    payInvoice
      .mockRejectedValueOnce(new AlbyProtocolError('http', 401, { error: 'expired access token' }))
      .mockRejectedValueOnce(new AlbyProtocolError('http', 401, { error: 'unauthorized' }));
    const harness = createSession({ http: { refreshAccessToken, payInvoice } });
    seedTokens(harness.memory, freshToken());
    harness.memory.set(
      ALBY_DISPLAY_KEY,
      JSON.stringify({ balanceSats: 1, lightningAddress: 'me@getalby.com' })
    );
    harness.memory.set(
      ALBY_OAUTH_PENDING_KEY,
      JSON.stringify({ codeVerifier: 'verifier', state: 'state' })
    );

    await expectProviderError(() => harness.session.payAlbyInvoice('lnbc1'), {
      kind: 'session_ended',
      httpStatus: 401,
    });
    expect(harness.memory.size).toBe(0);
    expect(harness.session.getAlbyAccountSnapshot()).toBeNull();
  });

  it('keeps tokens when refresh fails with a server or transport error', async () => {
    for (const httpStatus of [503, null]) {
      const refreshAccessToken = vi.fn(async () => {
        throw new AlbyProtocolError('http', httpStatus, null);
      });
      const payInvoice = vi.fn(async () => paid);
      const harness = createSession({ http: { refreshAccessToken, payInvoice } });
      seedTokens(harness.memory, expiredToken());

      await expectProviderError(() => harness.session.payAlbyInvoice('lnbc1'), {
        kind: 'transport',
        httpStatus,
      });
      expect(payInvoice).not.toHaveBeenCalled();
      expect(harness.memory.get(ALBY_TOKENS_KEY)).toContain('old-access');
    }
  });

  it('clears tokens when refresh is rejected', async () => {
    const refreshAccessToken = vi.fn(async () => {
      throw new AlbyProtocolError('http', 400, { error: 'invalid_grant' });
    });
    const payInvoice = vi.fn(async () => paid);
    const harness = createSession({ http: { refreshAccessToken, payInvoice } });
    seedTokens(harness.memory, expiredToken());

    await expectProviderError(() => harness.session.payAlbyInvoice('lnbc1'), {
      kind: 'session_ended',
      httpStatus: 400,
    });
    expect(payInvoice).not.toHaveBeenCalled();
    expect(harness.memory.has(ALBY_TOKENS_KEY)).toBe(false);
  });

  it('rejects an invalid payment without refreshing', async () => {
    const refreshAccessToken = vi.fn(async () => freshToken());
    const payInvoice = vi.fn(async () => paid);
    payInvoice.mockRejectedValueOnce(new AlbyProtocolError('invalid_request', null, null));
    const harness = createSession({ http: { refreshAccessToken, payInvoice } });
    seedTokens(harness.memory, freshToken());

    await expectProviderError(() => harness.session.payAlbyInvoice(''), {
      kind: 'rejected',
      httpStatus: null,
    });
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(payInvoice).toHaveBeenCalledTimes(1);
    expect(harness.memory.has(ALBY_TOKENS_KEY)).toBe(true);
  });
});

describe('loadAlbyConnection and disconnectAlby', () => {
  const display: AlbyAccountSnapshot = { balanceSats: 7, lightningAddress: 'me@getalby.com' };

  it('publishes the stored display and does not call HTTP', async () => {
    const harness = createSession();
    seedTokens(harness.memory, freshToken());
    harness.memory.set(ALBY_DISPLAY_KEY, JSON.stringify(display));
    expect(harness.session.getAlbyAccountSnapshot()).toBeNull();

    await harness.session.loadAlbyConnection();

    expect(harness.session.getAlbyAccountSnapshot()).toEqual(display);
    expect(harness.getAccountSummary).not.toHaveBeenCalled();
    expect(harness.getValue4Value).not.toHaveBeenCalled();
    expect(harness.refreshAccessToken).not.toHaveBeenCalled();
    expect(harness.exchangeAuthorizationCode).not.toHaveBeenCalled();
    expect(harness.payInvoice).not.toHaveBeenCalled();
  });

  it('clears tokens and the snapshot', async () => {
    const harness = createSession();
    seedTokens(harness.memory, freshToken());
    harness.memory.set(ALBY_DISPLAY_KEY, JSON.stringify(display));
    harness.memory.set(
      ALBY_OAUTH_PENDING_KEY,
      JSON.stringify({ codeVerifier: 'verifier', state: 'state' })
    );
    await harness.session.loadAlbyConnection();

    await harness.session.disconnectAlby();

    expect(harness.session.getAlbyAccountSnapshot()).toBeNull();
    expect(harness.memory.size).toBe(0);
  });
});

describe('Alby config getters', () => {
  const CLIENT_ID = 'EXPO_PUBLIC_ALBY_OAUTH_CLIENT_ID';
  const AUTHORIZE_URL = 'EXPO_PUBLIC_ALBY_OAUTH_AUTHORIZE_URL';
  const API_BASE = 'EXPO_PUBLIC_ALBY_API_BASE_URL';
  const REDIRECT_URI = 'EXPO_PUBLIC_ALBY_OAUTH_REDIRECT_URI';
  const SCHEMES = 'EXPO_PUBLIC_MOBILE_DEEP_LINK_SCHEMES';
  const keys = [CLIENT_ID, AUTHORIZE_URL, API_BASE, REDIRECT_URI, SCHEMES];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));

  const setEnv = (key: string, value: string | undefined): void => {
    if (value === undefined) {
      delete process.env[key];
      return;
    }
    process.env[key] = value;
  };

  afterEach(() => {
    for (const [key, value] of previous) {
      setEnv(key, value);
    }
  });

  it('treats an empty client id as null', () => {
    setEnv(CLIENT_ID, undefined);
    expect(getAlbyOAuthClientIdFromEnv()).toBeNull();
    setEnv(CLIENT_ID, '');
    expect(getAlbyOAuthClientIdFromEnv()).toBeNull();
    setEnv(CLIENT_ID, '   ');
    expect(getAlbyOAuthClientIdFromEnv()).toBeNull();
    setEnv(CLIENT_ID, ' client-id ');
    expect(getAlbyOAuthClientIdFromEnv()).toBe('client-id');
  });

  it('falls back when an Alby URL is not https and strips a trailing slash', () => {
    setEnv(API_BASE, 'http://api.example.com');
    setEnv(AUTHORIZE_URL, 'http://getalby.com/oauth');
    expect(getAlbyApiBaseUrlFromEnv()).toBe('https://api.getalby.com');
    expect(getAlbyOAuthAuthorizeUrlFromEnv()).toBe('https://getalby.com/oauth');

    setEnv(API_BASE, 'https://api.example.com/');
    expect(getAlbyApiBaseUrlFromEnv()).toBe('https://api.example.com');
  });

  it('falls back when the redirect scheme is not registered', () => {
    setEnv(SCHEMES, 'podverse-next podverse');
    setEnv(REDIRECT_URI, 'https://example.com/alby/callback');
    expect(getAlbyOAuthRedirectUriFromEnv()).toBe('podverse-next://alby/callback');

    setEnv(REDIRECT_URI, 'podverse://alby/callback');
    expect(getAlbyOAuthRedirectUriFromEnv()).toBe('podverse://alby/callback');
  });
});
