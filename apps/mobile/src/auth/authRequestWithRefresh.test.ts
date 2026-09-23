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
          accessToken: 'stale-access',
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
          accessToken: 'stale-access',
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
          accessToken: 'stale-access',
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
      accessToken: 'stale-access',
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
    let resolveRefresh: (value: {
      access_token: string;
      refresh_token: string;
    }) => void = () => undefined;

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
