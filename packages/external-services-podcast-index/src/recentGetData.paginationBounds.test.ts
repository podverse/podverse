import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ILoggerLike } from '@podverse/helpers-backend';

import { PodcastIndexService } from './index.js';
import { RECENT_GET_DATA_MAX_FETCH_MS } from './recentGetDataLimits.js';

const requestWithUserAgent = vi.fn();

vi.mock('@podverse/helpers-requests', () => ({
  requestWithUserAgent: (...args: unknown[]) => requestWithUserAgent(...args),
}));

function createLogger(): ILoggerLike {
  return {
    addRemoteTransport: vi.fn(),
    logError: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

describe('PodcastIndexService.recentGetData pagination wall cap', () => {
  beforeEach(() => {
    requestWithUserAgent.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-19T02:20:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns partial feeds without throwing when wall cap is exceeded before the next page', async () => {
    const loggerService = createLogger();
    const service = new PodcastIndexService({
      userAgent: 'test-agent',
      authKey: 'auth-key',
      baseUrl: 'https://api.podcastindex.org/api/1.0',
      secretKey: 'secret-key',
      loggerService,
      maxRetries: 3,
      retryBaseDelayMs: 1000,
    });

    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const firstPageFeed = { feedId: 1, feedUrl: 'https://example.com/page-1.xml' };
    const secondPageFeed = { feedId: 2, feedUrl: 'https://example.com/page-2.xml' };

    requestWithUserAgent.mockImplementation(async () => {
      if (requestWithUserAgent.mock.calls.length === 1) {
        vi.advanceTimersByTime(RECENT_GET_DATA_MAX_FETCH_MS + 1);
        return {
          data: {
            data: {
              feeds: [firstPageFeed],
            },
            nextSince: currentTimeInSeconds - 60,
          },
        };
      }

      return {
        data: {
          data: {
            feeds: [secondPageFeed],
          },
          nextSince: 0,
        },
      };
    });

    const result = await service.recentGetData(900);

    expect(result).toEqual([firstPageFeed]);
    expect(requestWithUserAgent).toHaveBeenCalledTimes(1);
    expect(loggerService.warn).toHaveBeenCalledWith(
      expect.stringContaining('[recentGetData] Stopping pagination after')
    );
    expect(loggerService.warn).toHaveBeenCalledWith(
      expect.stringContaining(`cap ${RECENT_GET_DATA_MAX_FETCH_MS}ms`)
    );
  });
});
