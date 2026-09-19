import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestWithMobileAuthRefresh = vi.fn();

vi.mock('../../auth/authRequestWithRefresh', () => ({
  requestWithMobileAuthRefresh: (...args: unknown[]) => requestWithMobileAuthRefresh(...args),
}));

import { statsRepository } from './statsRepository';

const context = {
  accessToken: 'token',
  clearSession: async () => {},
  refreshToken: 'refresh',
  setTokens: async () => {},
};

const targets = {
  channelIdText: 'chan01',
  clipIdText: null,
  itemIdText: 'item01',
};

describe('statsRepository.replayPlaybackStats', () => {
  beforeEach(() => {
    requestWithMobileAuthRefresh.mockReset();
  });

  it('resolves when the server rejects the stat, so a drain is never abandoned over telemetry', async () => {
    requestWithMobileAuthRefresh.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 403'), {
        response: { status: 403 },
      })
    );

    await expect(statsRepository.replayPlaybackStats(context, targets)).resolves.toBeUndefined();
  });

  it('sends one request per populated target', async () => {
    requestWithMobileAuthRefresh.mockResolvedValue(undefined);

    await statsRepository.replayPlaybackStats(context, targets);

    expect(requestWithMobileAuthRefresh).toHaveBeenCalledTimes(2);
  });
});
