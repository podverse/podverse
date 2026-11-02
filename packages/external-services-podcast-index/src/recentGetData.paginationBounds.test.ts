import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ILoggerLike } from '@podverse/helpers-backend';

import { PodcastIndexService } from './index.js';
import type { RecentDataPage, RecentGetDataStopReason } from './recentDataPage.js';
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

function createService(loggerService: ILoggerLike): PodcastIndexService {
  return new PodcastIndexService({
    userAgent: 'test-agent',
    authKey: 'auth-key',
    baseUrl: 'https://api.podcastindex.org/api/1.0',
    secretKey: 'secret-key',
    loggerService,
    maxRetries: 3,
    retryBaseDelayMs: 1000,
  });
}

function recentDataResponse(
  feeds: { feedId: number; feedUrl: string }[],
  nextSince: number | null,
  position = 0
) {
  return {
    data: {
      data: { position, feeds },
      ...(nextSince === null ? {} : { nextSince }),
    },
  };
}

async function drain(
  pages: AsyncGenerator<RecentDataPage, RecentGetDataStopReason>
): Promise<{ pages: RecentDataPage[]; stopReason: RecentGetDataStopReason }> {
  const collected: RecentDataPage[] = [];
  while (true) {
    const step = await pages.next();
    if (step.done === true) {
      return { pages: collected, stopReason: step.value };
    }
    collected.push(step.value);
  }
}

describe('PodcastIndexService.recentGetData pages', () => {
  beforeEach(() => {
    requestWithUserAgent.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-19T02:20:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('yields each page with its nextSince and position and follows nextSince until caught up', async () => {
    const service = createService(createLogger());
    const nowSeconds = Math.floor(Date.now() / 1000);
    const since = nowSeconds - 900;

    requestWithUserAgent
      .mockResolvedValueOnce(
        recentDataResponse([{ feedId: 1, feedUrl: 'https://example.com/1.xml' }], since + 300, 10)
      )
      .mockResolvedValueOnce(
        recentDataResponse([{ feedId: 2, feedUrl: 'https://example.com/2.xml' }], since + 300, 11)
      );

    const result = await drain(service.recentGetData(since));

    expect(result.stopReason).toBe('caught_up');
    expect(result.pages).toEqual([
      {
        since,
        feeds: [{ feedId: 1, feedUrl: 'https://example.com/1.xml' }],
        nextSince: since + 300,
        position: 10,
      },
      {
        since: since + 300,
        feeds: [{ feedId: 2, feedUrl: 'https://example.com/2.xml' }],
        nextSince: since + 300,
        position: 11,
      },
    ]);
    expect(requestWithUserAgent.mock.calls[0]?.[0]).toContain(`since=${since}`);
    expect(requestWithUserAgent.mock.calls[1]?.[0]).toContain(`since=${since + 300}`);
  });

  it('does not request the next page until the caller asks for it', async () => {
    const service = createService(createLogger());
    const nowSeconds = Math.floor(Date.now() / 1000);
    const since = nowSeconds - 900;

    requestWithUserAgent.mockResolvedValue(
      recentDataResponse([{ feedId: 1, feedUrl: 'https://example.com/1.xml' }], since + 60)
    );

    const pages = service.recentGetData(since);
    await pages.next();

    expect(requestWithUserAgent).toHaveBeenCalledTimes(1);
  });

  it('stops after a page without nextSince', async () => {
    const service = createService(createLogger());
    const since = Math.floor(Date.now() / 1000) - 900;

    requestWithUserAgent.mockResolvedValue(
      recentDataResponse([{ feedId: 1, feedUrl: 'https://example.com/1.xml' }], null)
    );

    const result = await drain(service.recentGetData(since));

    expect(result.stopReason).toBe('caught_up');
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]?.nextSince).toBeNull();
    expect(requestWithUserAgent).toHaveBeenCalledTimes(1);
  });

  it('stops at the wall cap before the next request and reports time_cap', async () => {
    const loggerService = createLogger();
    const service = createService(loggerService);
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const firstPageFeed = { feedId: 1, feedUrl: 'https://example.com/page-1.xml' };
    const secondPageFeed = { feedId: 2, feedUrl: 'https://example.com/page-2.xml' };

    requestWithUserAgent.mockImplementation(async () => {
      if (requestWithUserAgent.mock.calls.length === 1) {
        vi.advanceTimersByTime(RECENT_GET_DATA_MAX_FETCH_MS + 1);
        return recentDataResponse([firstPageFeed], currentTimeInSeconds - 60);
      }
      return recentDataResponse([secondPageFeed], null);
    });

    const result = await drain(service.recentGetData(currentTimeInSeconds - 900));

    expect(result.stopReason).toBe('time_cap');
    expect(result.pages.map((page) => page.feeds)).toEqual([[firstPageFeed]]);
    expect(requestWithUserAgent).toHaveBeenCalledTimes(1);
    expect(loggerService.warn).toHaveBeenCalledWith(
      expect.stringContaining('[recentGetData] Stopping pagination after')
    );
    expect(loggerService.warn).toHaveBeenCalledWith(
      expect.stringContaining(`cap ${RECENT_GET_DATA_MAX_FETCH_MS}ms`)
    );
  });
});
