import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ILoggerLike } from '@podverse/helpers-backend';

import { PodcastIndexService } from './index.js';
import type { RecentDataPage, RecentGetDataStopReason } from './recentDataPage.js';
import { PODCAST_INDEX_PAGE_REQUEST_TIMEOUT_MS } from './recentGetDataLimits.js';

const requestWithUserAgent = vi.fn();

vi.mock('@podverse/helpers-requests', () => ({
  requestWithUserAgent: (...args: unknown[]) => requestWithUserAgent(...args),
}));

async function drain(pages: AsyncGenerator<RecentDataPage, RecentGetDataStopReason>) {
  while (true) {
    const step = await pages.next();
    if (step.done === true) {
      return step.value;
    }
  }
}

async function drainPages(pages: AsyncGenerator<RecentDataPage, RecentGetDataStopReason>) {
  const yielded: RecentDataPage[] = [];
  while (true) {
    const step = await pages.next();
    if (step.done === true) {
      return { yielded, stopReason: step.value };
    }
    yielded.push(step.value);
  }
}

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

function isAbortConfig(value: unknown): value is {
  controller: AbortController;
  timeoutMs: number;
} {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const controller = Reflect.get(value, 'controller');
  const timeoutMs = Reflect.get(value, 'timeoutMs');
  return controller instanceof AbortController && typeof timeoutMs === 'number';
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

    await drain(service.recentGetData(Math.floor(Date.now() / 1000) - 900));

    expect(requestWithUserAgent).toHaveBeenCalledTimes(1);
    const abortArg = requestWithUserAgent.mock.calls[0]?.[3];
    expect(isAbortConfig(abortArg)).toBe(true);
    if (isAbortConfig(abortArg)) {
      expect(abortArg.timeoutMs).toBe(PODCAST_INDEX_PAGE_REQUEST_TIMEOUT_MS);
      expect(abortArg.controller).toBeInstanceOf(AbortController);
    }
  });

  it('retries deadline aborts and resolves as time_cap after retries are exhausted', async () => {
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
      message: 'canceled by timeout',
      code: 'ERR_CANCELED',
      name: 'CanceledError',
    });

    const run = drain(service.recentGetData(Math.floor(Date.now() / 1000) - 900));
    await vi.runAllTimersAsync();
    await expect(run).resolves.toBe('time_cap');

    expect(requestWithUserAgent).toHaveBeenCalledTimes(4);
    const abortControllers = requestWithUserAgent.mock.calls.map((call) => {
      const abortArg = call[3];
      expect(isAbortConfig(abortArg)).toBe(true);
      if (!isAbortConfig(abortArg)) {
        throw new Error('Expected abort config');
      }
      expect(abortArg.timeoutMs).toBe(PODCAST_INDEX_PAGE_REQUEST_TIMEOUT_MS);
      return abortArg.controller;
    });
    expect(new Set(abortControllers).size).toBe(4);
    expect(loggerService.warn).toHaveBeenCalledTimes(1);
    expect(loggerService.logError).toHaveBeenCalledTimes(1);
  });

  it('resolves as upstream_error when a 502 survives retries', async () => {
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
      message: 'Request failed with status code 502',
      response: { status: 502 },
    });

    const run = drain(service.recentGetData(Math.floor(Date.now() / 1000) - 900));
    await vi.runAllTimersAsync();
    await expect(run).resolves.toBe('upstream_error');

    expect(requestWithUserAgent).toHaveBeenCalledTimes(4);
    expect(loggerService.warn).toHaveBeenCalledWith(
      expect.stringContaining('Upstream error after retries')
    );
  });

  it('resolves as upstream_error when a network error survives retries', async () => {
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
      message: 'socket hang up',
      code: 'ECONNRESET',
    });

    const run = drain(service.recentGetData(Math.floor(Date.now() / 1000) - 900));
    await vi.runAllTimersAsync();
    await expect(run).resolves.toBe('upstream_error');

    expect(requestWithUserAgent).toHaveBeenCalledTimes(4);
    expect(loggerService.warn).toHaveBeenCalledWith(
      expect.stringContaining('stopping and resuming next run from the last completed page')
    );
  });

  it('still rejects HTTP 404', async () => {
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
      message: 'Request failed with status code 404',
      response: { status: 404 },
    });

    await expect(drain(service.recentGetData(Math.floor(Date.now() / 1000) - 900))).rejects.toEqual(
      expect.objectContaining({ message: 'Request failed with status code 404' })
    );
    expect(loggerService.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('Upstream error after retries')
    );
  });

  it('yields finished pages and then stops with upstream_error', async () => {
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
    const startedAtSeconds = Math.floor(Date.now() / 1000);

    requestWithUserAgent.mockResolvedValueOnce({
      data: {
        data: {
          feeds: [{ feedId: 1, feedUrl: 'https://example.com/feed.xml' }],
        },
        nextSince: startedAtSeconds,
      },
    });
    requestWithUserAgent.mockRejectedValue({
      message: 'Request failed with status code 502',
      response: { status: 502 },
    });

    const run = drainPages(service.recentGetData(startedAtSeconds - 900));
    await vi.runAllTimersAsync();
    const result = await run;

    expect(result.stopReason).toBe('upstream_error');
    expect(result.yielded).toHaveLength(1);
    expect(result.yielded[0]?.feeds).toEqual([
      { feedId: 1, feedUrl: 'https://example.com/feed.xml' },
    ]);
    expect(requestWithUserAgent).toHaveBeenCalledTimes(5);
  });

  it('still rejects non-abort failures', async () => {
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

    requestWithUserAgent.mockRejectedValue(new Error('boom'));

    await expect(drain(service.recentGetData(Math.floor(Date.now() / 1000) - 900))).rejects.toThrow(
      'boom'
    );
    expect(loggerService.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('Timed out after retries')
    );
  });
});
