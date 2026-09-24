import { beforeEach, describe, expect, it, vi } from 'vitest';

const isOfflineModeEnabled = vi.fn(() => false);
const reportNetworkOutcome = vi.fn();
const createMobileApiRequestService = vi.fn();

vi.mock('../prefs/offlineMode', () => ({
  OfflineModeEnabledError: class OfflineModeEnabledError extends Error {
    constructor() {
      super('Offline Mode is enabled');
      this.name = 'OfflineModeEnabledError';
    }
  },
  isOfflineModeEnabled: () => isOfflineModeEnabled(),
}));

vi.mock('../net/connectivity', () => ({
  reportNetworkOutcome: (...args: unknown[]) => reportNetworkOutcome(...args),
}));

vi.mock('./mobileApi', () => ({
  createMobileApiRequestService: (...args: unknown[]) => createMobileApiRequestService(...args),
}));

import {
  advanceAuthSessionGeneration,
  refreshAccessTokenSingleFlight,
  requestWithMobileAuthRefresh,
} from './authRequestWithRefresh';

const httpError = (status: number): Error => {
  const error = new Error(`Request failed with status code ${status}`);
  Object.assign(error, { response: { status } });
  return error;
};

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const encodeBase64Url = (value: string): string => {
  const bytes = Array.from(value, (char) => char.charCodeAt(0));
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const b0 = bytes[index] ?? 0;
    const b1 = bytes[index + 1];
    const b2 = bytes[index + 2];
    output += BASE64_ALPHABET.charAt(b0 >> 2);
    output += BASE64_ALPHABET.charAt(((b0 & 3) << 4) | ((b1 ?? 0) >> 4));
    if (b1 === undefined) {
      break;
    }
    output += BASE64_ALPHABET.charAt(((b1 & 15) << 2) | ((b2 ?? 0) >> 6));
    if (b2 === undefined) {
      break;
    }
    output += BASE64_ALPHABET.charAt(b2 & 63);
  }
  return output;
};

const jwtWithExp = (expSeconds: number): string => {
  return `header.${encodeBase64Url(JSON.stringify({ exp: expSeconds }))}.sig`;
};

const accessTokenExpiringIn = (secondsFromNow: number): string =>
  jwtWithExp(Math.floor(Date.now() / 1000) + secondsFromNow);

const sentAccessTokens = (): unknown[] =>
  createMobileApiRequestService.mock.calls
    .filter((call) => call.length > 0)
    .map((call) => call[0]);

describe('requestWithMobileAuthRefresh', () => {
  const clearSession = vi.fn(async () => undefined);
  const setTokens = vi.fn(async () => undefined);

  beforeEach(() => {
    isOfflineModeEnabled.mockReset();
    isOfflineModeEnabled.mockReturnValue(false);
    reportNetworkOutcome.mockReset();
    createMobileApiRequestService.mockReset();
    clearSession.mockReset();
    clearSession.mockResolvedValue(undefined);
    setTokens.mockReset();
    setTokens.mockResolvedValue(undefined);
    // Leave any prior single-flight refresh settled before the next case.
    advanceAuthSessionGeneration();
  });

  it('sends a still-valid access token without refreshing', async () => {
    const accessToken = accessTokenExpiringIn(3600);
    createMobileApiRequestService.mockReturnValue({});
    const runRequest = vi.fn().mockResolvedValue({ ok: true });

    await expect(
      requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken: 'refresh',
          setTokens,
        },
        runRequest
      )
    ).resolves.toEqual({ ok: true });

    expect(createMobileApiRequestService).toHaveBeenCalledTimes(1);
    expect(createMobileApiRequestService).toHaveBeenCalledWith(accessToken);
    expect(runRequest).toHaveBeenCalledTimes(1);
    expect(setTokens).not.toHaveBeenCalled();
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('refreshes an expired access token before the request and sends only the new token', async () => {
    const expiredAccessToken = accessTokenExpiringIn(-120);
    const nextAccessToken = accessTokenExpiringIn(3600);
    const reqAuthMobileRefresh = vi.fn(async () => ({
      access_token: nextAccessToken,
      refresh_token: 'new-refresh',
    }));
    createMobileApiRequestService.mockImplementation((token?: unknown) => {
      if (token === undefined) {
        return { reqAuthMobileRefresh };
      }
      return {};
    });
    const runRequest = vi.fn().mockResolvedValue({ ok: true });

    await expect(
      requestWithMobileAuthRefresh(
        {
          accessToken: expiredAccessToken,
          clearSession,
          refreshToken: 'refresh',
          setTokens,
        },
        runRequest
      )
    ).resolves.toEqual({ ok: true });

    expect(reqAuthMobileRefresh).toHaveBeenCalledTimes(1);
    expect(runRequest).toHaveBeenCalledTimes(1);
    expect(sentAccessTokens()).toEqual([nextAccessToken]);
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('refreshes an access token inside the skew window before sending', async () => {
    const expiringAccessToken = accessTokenExpiringIn(30);
    const nextAccessToken = accessTokenExpiringIn(3600);
    const reqAuthMobileRefresh = vi.fn(async () => ({
      access_token: nextAccessToken,
      refresh_token: 'new-refresh',
    }));
    createMobileApiRequestService.mockImplementation((token?: unknown) => {
      if (token === undefined) {
        return { reqAuthMobileRefresh };
      }
      return {};
    });
    const runRequest = vi.fn().mockResolvedValue({ ok: true });

    await expect(
      requestWithMobileAuthRefresh(
        {
          accessToken: expiringAccessToken,
          clearSession,
          refreshToken: 'refresh',
          setTokens,
        },
        runRequest
      )
    ).resolves.toEqual({ ok: true });

    expect(reqAuthMobileRefresh).toHaveBeenCalledTimes(1);
    expect(sentAccessTokens()).toEqual([nextAccessToken]);
  });

  it('refreshes an unreadable access token before sending', async () => {
    const nextAccessToken = accessTokenExpiringIn(3600);
    const reqAuthMobileRefresh = vi.fn(async () => ({
      access_token: nextAccessToken,
      refresh_token: 'new-refresh',
    }));
    createMobileApiRequestService.mockImplementation((token?: unknown) => {
      if (token === undefined) {
        return { reqAuthMobileRefresh };
      }
      return {};
    });
    const runRequest = vi.fn().mockResolvedValue({ ok: true });

    await expect(
      requestWithMobileAuthRefresh(
        {
          accessToken: 'not-a-jwt',
          clearSession,
          refreshToken: 'refresh',
          setTokens,
        },
        runRequest
      )
    ).resolves.toEqual({ ok: true });

    expect(reqAuthMobileRefresh).toHaveBeenCalledTimes(1);
    expect(sentAccessTokens()).toEqual([nextAccessToken]);
  });

  it('coalesces concurrent expired callers into one refresh and sends the new token', async () => {
    const expiredAccessToken = accessTokenExpiringIn(-120);
    const nextAccessToken = accessTokenExpiringIn(3600);
    const reqAuthMobileRefresh = vi.fn(async () => ({
      access_token: nextAccessToken,
      refresh_token: 'new-refresh',
    }));
    createMobileApiRequestService.mockImplementation((token?: unknown) => {
      if (token === undefined) {
        return { reqAuthMobileRefresh };
      }
      return {};
    });
    const runRequest = vi.fn().mockResolvedValue({ ok: true });
    const deps = {
      accessToken: expiredAccessToken,
      clearSession,
      refreshToken: 'refresh',
      setTokens,
    };

    const results = await Promise.all([
      requestWithMobileAuthRefresh(deps, runRequest),
      requestWithMobileAuthRefresh(deps, runRequest),
      requestWithMobileAuthRefresh(deps, runRequest),
      requestWithMobileAuthRefresh(deps, runRequest),
      requestWithMobileAuthRefresh(deps, runRequest),
    ]);

    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }, { ok: true }, { ok: true }]);
    expect(reqAuthMobileRefresh).toHaveBeenCalledTimes(1);
    expect(setTokens).toHaveBeenCalledTimes(1);
    expect(sentAccessTokens().every((token) => token === nextAccessToken)).toBe(true);
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('sends the stored access token when a later call still holds the expired one', async () => {
    const expiredAccessToken = accessTokenExpiringIn(-120);
    const nextAccessToken = accessTokenExpiringIn(3600);
    const reqAuthMobileRefresh = vi.fn(async () => ({
      access_token: nextAccessToken,
      refresh_token: 'new-refresh',
    }));
    createMobileApiRequestService.mockImplementation((token?: unknown) => {
      if (token === undefined) {
        return { reqAuthMobileRefresh };
      }
      return {};
    });
    const runRequest = vi.fn().mockResolvedValue({ ok: true });
    const deps = {
      accessToken: expiredAccessToken,
      clearSession,
      refreshToken: 'refresh',
      setTokens,
    };

    await requestWithMobileAuthRefresh(deps, runRequest);
    await requestWithMobileAuthRefresh(deps, runRequest);

    expect(reqAuthMobileRefresh).toHaveBeenCalledTimes(1);
    expect(runRequest).toHaveBeenCalledTimes(2);
    expect(sentAccessTokens()).toEqual([nextAccessToken, nextAccessToken]);
  });

  it('omits an expired access token when there is no refresh token', async () => {
    createMobileApiRequestService.mockReturnValue({});
    const runRequest = vi.fn().mockResolvedValue({ ok: true });

    await expect(
      requestWithMobileAuthRefresh(
        {
          accessToken: accessTokenExpiringIn(-120),
          clearSession,
          refreshToken: null,
          setTokens,
        },
        runRequest
      )
    ).resolves.toEqual({ ok: true });

    expect(createMobileApiRequestService).toHaveBeenCalledWith(null);
    expect(runRequest).toHaveBeenCalledTimes(1);
    expect(setTokens).not.toHaveBeenCalled();
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('does not clear the session when refresh fails for a network error', async () => {
    const reqAuthMobileRefresh = vi.fn(async () => {
      throw new Error('network down');
    });
    createMobileApiRequestService.mockReturnValue({ reqAuthMobileRefresh });
    const runRequest = vi.fn();

    await expect(
      requestWithMobileAuthRefresh(
        {
          accessToken: accessTokenExpiringIn(-120),
          clearSession,
          refreshToken: 'refresh',
          setTokens,
        },
        runRequest
      )
    ).rejects.toThrow('network down');

    expect(runRequest).not.toHaveBeenCalled();
    expect(setTokens).not.toHaveBeenCalled();
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('clears the session when a just-refreshed access token is still 401', async () => {
    const nextAccessToken = accessTokenExpiringIn(3600);
    const reqAuthMobileRefresh = vi.fn(async () => ({
      access_token: nextAccessToken,
      refresh_token: 'new-refresh',
    }));
    createMobileApiRequestService.mockImplementation((token?: unknown) => {
      if (token === undefined) {
        return { reqAuthMobileRefresh };
      }
      return {};
    });
    const runRequest = vi.fn().mockRejectedValue(httpError(401));

    await expect(
      requestWithMobileAuthRefresh(
        {
          accessToken: accessTokenExpiringIn(-120),
          clearSession,
          refreshToken: 'refresh',
          setTokens,
        },
        runRequest
      )
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(reqAuthMobileRefresh).toHaveBeenCalledTimes(1);
    expect(runRequest).toHaveBeenCalledTimes(1);
    expect(sentAccessTokens()).toEqual([nextAccessToken]);
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(clearSession).toHaveBeenCalledWith('session_expired');
  });

  it('clears the session when refresh succeeds but the retry is still 401', async () => {
    const reqAuthMobileRefresh = vi.fn(async () => ({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
    }));

    createMobileApiRequestService
      .mockReturnValueOnce({})
      .mockReturnValueOnce({ reqAuthMobileRefresh })
      .mockReturnValueOnce({});

    const runRequest = vi
      .fn()
      .mockRejectedValueOnce(httpError(401))
      .mockRejectedValueOnce(httpError(401));

    await expect(
      requestWithMobileAuthRefresh(
        {
          accessToken: accessTokenExpiringIn(3600),
          clearSession,
          refreshToken: 'stale-refresh',
          setTokens,
        },
        runRequest
      )
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(setTokens).toHaveBeenCalledTimes(1);
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(clearSession).toHaveBeenCalledWith('session_expired');
    expect(runRequest).toHaveBeenCalledTimes(2);
  });

  it('clears the session when the refresh call itself returns 401', async () => {
    const reqAuthMobileRefresh = vi.fn(async () => {
      throw httpError(401);
    });

    createMobileApiRequestService
      .mockReturnValueOnce({})
      .mockReturnValueOnce({ reqAuthMobileRefresh });

    const runRequest = vi.fn().mockRejectedValueOnce(httpError(401));

    await expect(
      requestWithMobileAuthRefresh(
        {
          accessToken: accessTokenExpiringIn(3600),
          clearSession,
          refreshToken: 'stale-refresh',
          setTokens,
        },
        runRequest
      )
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(setTokens).not.toHaveBeenCalled();
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(clearSession).toHaveBeenCalledWith('session_expired');
  });

  it('returns the retry result when refresh succeeds and the retry succeeds', async () => {
    const reqAuthMobileRefresh = vi.fn(async () => ({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
    }));

    createMobileApiRequestService
      .mockReturnValueOnce({})
      .mockReturnValueOnce({ reqAuthMobileRefresh })
      .mockReturnValueOnce({});

    const runRequest = vi
      .fn()
      .mockRejectedValueOnce(httpError(401))
      .mockResolvedValueOnce({ ok: true });

    await expect(
      requestWithMobileAuthRefresh(
        {
          accessToken: accessTokenExpiringIn(3600),
          clearSession,
          refreshToken: 'stale-refresh',
          setTokens,
        },
        runRequest
      )
    ).resolves.toEqual({ ok: true });

    expect(setTokens).toHaveBeenCalledTimes(1);
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('coalesces concurrent 401s into one refresh and at most one setTokens', async () => {
    const reqAuthMobileRefresh = vi.fn(async () => ({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
    }));

    createMobileApiRequestService.mockImplementation((token?: unknown) => {
      if (token === undefined) {
        return { reqAuthMobileRefresh };
      }
      return {};
    });

    const runRequest = vi.fn().mockRejectedValue(httpError(401));

    const deps = {
      accessToken: accessTokenExpiringIn(3600),
      clearSession,
      refreshToken: 'stale-refresh',
      setTokens,
    };

    const results = await Promise.allSettled([
      requestWithMobileAuthRefresh(deps, runRequest),
      requestWithMobileAuthRefresh(deps, runRequest),
      requestWithMobileAuthRefresh(deps, runRequest),
      requestWithMobileAuthRefresh(deps, runRequest),
      requestWithMobileAuthRefresh(deps, runRequest),
    ]);

    expect(results.every((result) => result.status === 'rejected')).toBe(true);
    expect(reqAuthMobileRefresh).toHaveBeenCalledTimes(1);
    expect(setTokens).toHaveBeenCalledTimes(1);
    expect(clearSession).toHaveBeenCalled();
    expect(clearSession.mock.calls.every((call) => call[0] === 'session_expired')).toBe(true);
  });
});

describe('refreshAccessTokenSingleFlight', () => {
  const clearSession = vi.fn(async () => undefined);
  const setTokens = vi.fn(async () => undefined);

  beforeEach(() => {
    isOfflineModeEnabled.mockReset();
    isOfflineModeEnabled.mockReturnValue(false);
    reportNetworkOutcome.mockReset();
    createMobileApiRequestService.mockReset();
    clearSession.mockReset();
    clearSession.mockResolvedValue(undefined);
    setTokens.mockReset();
    setTokens.mockResolvedValue(undefined);
    advanceAuthSessionGeneration();
  });

  it('skips setTokens when the session generation advances while refresh is in flight', async () => {
    let resolveRefresh: (value: { access_token: string; refresh_token: string }) => void = () =>
      undefined;

    const reqAuthMobileRefresh = vi.fn(
      () =>
        new Promise<{ access_token: string; refresh_token: string }>((resolve) => {
          resolveRefresh = resolve;
        })
    );

    createMobileApiRequestService.mockReturnValue({ reqAuthMobileRefresh });

    const refreshPromise = refreshAccessTokenSingleFlight({
      clearSession,
      refreshToken: 'stale-refresh',
      setTokens,
    });

    advanceAuthSessionGeneration();
    resolveRefresh({ access_token: 'new-access', refresh_token: 'new-refresh' });

    await expect(refreshPromise).resolves.toBeNull();
    expect(setTokens).not.toHaveBeenCalled();
    expect(clearSession).not.toHaveBeenCalled();
  });
});
