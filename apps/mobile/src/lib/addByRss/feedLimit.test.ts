import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  requestWithMobileAuthRefreshIfSignedIn,
  requestWithoutMobileAuth,
} from '../../auth/authRequestWithRefresh';
import type { MobileAuthRequestContext } from '../../data/repositories/types';
import { fetchAccountAddByRssFeedLimit, fetchAddByRssDefaultFeedLimit } from './feedLimit';

vi.mock('../../auth/authRequestWithRefresh', () => ({
  requestWithMobileAuthRefreshIfSignedIn: vi.fn(),
  requestWithoutMobileAuth: vi.fn(),
}));

const authContext = (): MobileAuthRequestContext => ({
  accessToken: 'access-token',
  clearSession: async () => undefined,
  refreshToken: 'refresh-token',
  setTokens: async () => undefined,
});

describe('fetchAddByRssDefaultFeedLimit', () => {
  beforeEach(() => {
    vi.mocked(requestWithoutMobileAuth).mockReset();
  });

  it('returns the number', async () => {
    vi.mocked(requestWithoutMobileAuth).mockResolvedValue({
      data: { maxAddByRSSFeeds: 100 },
    });

    await expect(fetchAddByRssDefaultFeedLimit()).resolves.toBe(100);

    vi.mocked(requestWithoutMobileAuth).mockResolvedValue({
      data: { maxAddByRSSFeeds: 0 },
    });

    await expect(fetchAddByRssDefaultFeedLimit()).resolves.toBe(0);
  });

  it('returns null when the request throws', async () => {
    vi.mocked(requestWithoutMobileAuth).mockRejectedValue(new Error('offline'));

    await expect(fetchAddByRssDefaultFeedLimit()).resolves.toBeNull();
  });

  it('returns null for a negative or non-integer value', async () => {
    vi.mocked(requestWithoutMobileAuth).mockResolvedValue({
      data: { maxAddByRSSFeeds: -1 },
    });
    await expect(fetchAddByRssDefaultFeedLimit()).resolves.toBeNull();

    vi.mocked(requestWithoutMobileAuth).mockResolvedValue({
      data: { maxAddByRSSFeeds: 1.5 },
    });
    await expect(fetchAddByRssDefaultFeedLimit()).resolves.toBeNull();
  });
});

describe('fetchAccountAddByRssFeedLimit', () => {
  beforeEach(() => {
    vi.mocked(requestWithMobileAuthRefreshIfSignedIn).mockReset();
  });

  it('returns the number', async () => {
    vi.mocked(requestWithMobileAuthRefreshIfSignedIn).mockResolvedValue({
      data: { maxAddByRSSFeeds: 40 },
    });
    const context = authContext();

    await expect(fetchAccountAddByRssFeedLimit(context)).resolves.toBe(40);
  });

  it('returns null when the helper returns null', async () => {
    vi.mocked(requestWithMobileAuthRefreshIfSignedIn).mockResolvedValue(null);

    await expect(fetchAccountAddByRssFeedLimit(authContext())).resolves.toBeNull();
  });

  it('returns null when the request throws a 403-shaped error', async () => {
    vi.mocked(requestWithMobileAuthRefreshIfSignedIn).mockRejectedValue(
      Object.assign(new Error('Forbidden'), {
        response: { status: 403, data: { code: 'membership_expired' } },
      })
    );

    await expect(fetchAccountAddByRssFeedLimit(authContext())).resolves.toBeNull();
  });
});
