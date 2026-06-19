import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_HTTP_TIMEOUT_MS } from '@podverse/helpers';
import type { ILoggerLike } from '@podverse/helpers-backend';

import { PodcastIndexService } from './index.js';

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

describe('PodcastIndexService.recentGetData HTTP timeout', () => {
  beforeEach(() => {
    requestWithUserAgent.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-19T02:20:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes per-page abort timeout to requestWithUserAgent', async () => {
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

    requestWithUserAgent.mockResolvedValue({
      data: {
        data: {
          feeds: [{ feedId: 1, feedUrl: 'https://example.com/feed.xml' }],
        },
        nextSince: 0,
      },
    });

    await service.recentGetData(900);

    expect(requestWithUserAgent).toHaveBeenCalledTimes(1);
    const abortArg = requestWithUserAgent.mock.calls[0]?.[3] as
      | { controller: AbortController; timeoutMs: number }
      | undefined;
    expect(abortArg).toEqual(
      expect.objectContaining({
        timeoutMs: DEFAULT_HTTP_TIMEOUT_MS,
      })
    );
    expect(abortArg?.controller).toBeInstanceOf(AbortController);
  });

  it('fails fast on timeout without retrying paginated recent/data requests', async () => {
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

    requestWithUserAgent.mockRejectedValue({
      message: 'timeout of 5000ms exceeded',
      code: 'ECONNABORTED',
      name: 'AxiosError',
    });

    await expect(service.recentGetData(900)).rejects.toMatchObject({ code: 'ECONNABORTED' });

    expect(requestWithUserAgent).toHaveBeenCalledTimes(1);
    expect(loggerService.warn).not.toHaveBeenCalled();
    expect(loggerService.logError).toHaveBeenCalledTimes(1);
  });
});
