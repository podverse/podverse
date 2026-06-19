import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

function createAxiosLikeError(status: number) {
  return {
    message: `Request failed with status code ${status}`,
    code: 'ERR_BAD_RESPONSE',
    response: { status },
    config: { url: 'https://api.podcastindex.org/api/1.0/recent/data', method: 'get' },
  };
}

describe('PodcastIndexService.podcastIndexAPIRequest retries', () => {
  beforeEach(() => {
    requestWithUserAgent.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries retryable failures then succeeds', async () => {
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

    requestWithUserAgent
      .mockRejectedValueOnce(createAxiosLikeError(500))
      .mockRejectedValueOnce(createAxiosLikeError(500))
      .mockResolvedValueOnce({ data: { status: 'true' } });

    const requestPromise = service.podcastIndexAPIRequest(
      'https://api.podcastindex.org/api/1.0/recent/data?max=5000&since=1'
    );

    await vi.runAllTimersAsync();
    const result = await requestPromise;

    expect(result).toEqual({ status: 'true' });
    expect(requestWithUserAgent).toHaveBeenCalledTimes(3);
    expect(loggerService.warn).toHaveBeenCalledTimes(2);
    expect(loggerService.logError).not.toHaveBeenCalled();
  });

  it('issues a fresh authenticated request on each attempt', async () => {
    const loggerService = createLogger();
    const service = new PodcastIndexService({
      userAgent: 'test-agent',
      authKey: 'auth-key',
      baseUrl: 'https://api.podcastindex.org/api/1.0',
      secretKey: 'secret-key',
      loggerService,
      maxRetries: 2,
      retryBaseDelayMs: 1,
    });

    requestWithUserAgent.mockImplementation(
      async (_url: string, config: { headers: Record<string, string | number> }) => {
        expect(config.headers['X-Auth-Key']).toBe('auth-key');
        expect(config.headers['X-Auth-Date']).toBeDefined();
        expect(config.headers.Authorization).toBeDefined();

        if (requestWithUserAgent.mock.calls.length < 3) {
          throw createAxiosLikeError(500);
        }
        return { data: { ok: true } };
      }
    );

    const requestPromise = service.podcastIndexAPIRequest(
      'https://api.podcastindex.org/api/1.0/recent/data?max=5000&since=1'
    );
    await vi.runAllTimersAsync();
    await requestPromise;

    expect(requestWithUserAgent).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retryable HTTP 404 failures', async () => {
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

    requestWithUserAgent.mockRejectedValue(createAxiosLikeError(404));

    await expect(
      service.podcastIndexAPIRequest('https://api.podcastindex.org/api/1.0/podcasts/byfeedid?id=1')
    ).rejects.toMatchObject({ response: { status: 404 } });

    expect(requestWithUserAgent).toHaveBeenCalledTimes(1);
    expect(loggerService.warn).not.toHaveBeenCalled();
    expect(loggerService.logError).toHaveBeenCalledTimes(1);
  });

  it('passes abort options to requestWithUserAgent when provided', async () => {
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

    requestWithUserAgent.mockResolvedValue({ data: { ok: true } });

    const abortController = new AbortController();
    await service.podcastIndexAPIRequest(
      'https://api.podcastindex.org/api/1.0/recent/data?max=5000&since=1',
      undefined,
      {
        abort: {
          controller: abortController,
          timeoutMs: 5000,
        },
      }
    );

    expect(requestWithUserAgent).toHaveBeenCalledWith(
      'https://api.podcastindex.org/api/1.0/recent/data?max=5000&since=1',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Auth-Key': 'auth-key',
        }),
      }),
      'test-agent',
      {
        controller: abortController,
        timeoutMs: 5000,
      }
    );
  });

  it('does not retry abort or timeout failures when abort options are provided', async () => {
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

    const abortController = new AbortController();
    await expect(
      service.podcastIndexAPIRequest(
        'https://api.podcastindex.org/api/1.0/recent/data?max=5000&since=1',
        undefined,
        {
          abort: {
            controller: abortController,
            timeoutMs: 5000,
          },
        }
      )
    ).rejects.toMatchObject({ code: 'ECONNABORTED' });

    expect(requestWithUserAgent).toHaveBeenCalledTimes(1);
    expect(loggerService.warn).not.toHaveBeenCalled();
    expect(loggerService.logError).toHaveBeenCalledTimes(1);
  });
});
