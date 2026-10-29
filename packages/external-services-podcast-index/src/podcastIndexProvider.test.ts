import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ILoggerLike } from '@podverse/helpers-backend';

import { PodcastIndexService } from './index.js';
import { PodcastIndexProvider, toIndexProviderFeed } from './podcastIndexProvider.js';

const requestWithUserAgent = vi.fn();

vi.mock('@podverse/helpers-requests', () => ({
  requestWithUserAgent: (...args: unknown[]) => requestWithUserAgent(...args),
}));

function createLogger(): ILoggerLike {
  return {
    addRemoteTransport: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    logError: vi.fn(),
    warn: vi.fn(),
  };
}

function createProvider(): PodcastIndexProvider {
  const service = new PodcastIndexService({
    authKey: 'auth-key',
    baseUrl: 'https://api.podcastindex.org/api/1.0',
    loggerService: createLogger(),
    maxRetries: 0,
    secretKey: 'secret-key',
    userAgent: 'test-agent',
  });
  return new PodcastIndexProvider(service);
}

function createUpstreamError(status: number): { response: { status: number } } {
  return { response: { status } };
}

describe('PodcastIndexProvider', () => {
  beforeEach(() => {
    requestWithUserAgent.mockReset();
  });

  it('resolveFeed returns found from byguid and skips byfeedurl lookups', async () => {
    requestWithUserAgent.mockResolvedValueOnce({
      data: {
        feed: {
          id: 321,
          podcastGuid: ' Guid-Found ',
          url: 'https://example.com/feed.xml',
          title: '  Example  ',
          dead: 0,
        },
      },
    });

    const provider = createProvider();
    const result = await provider.resolveFeed({
      feedGuid: ' Guid-Found ',
      feedUrl: 'https://fallback.example/feed.xml',
    });

    expect(result.status).toBe('found');
    if (result.status !== 'found') {
      throw new Error('Expected found result');
    }
    expect(result.value.feedGuid).toBe('guid-found');
    expect(requestWithUserAgent).toHaveBeenCalledTimes(1);
    expect(requestWithUserAgent.mock.calls[0]?.[0]).toContain('/podcasts/byguid?guid=');
  });

  it('resolveFeed falls back from guid miss to byfeedurl and can hit on http variant', async () => {
    requestWithUserAgent
      .mockResolvedValueOnce({
        data: {
          feed: {
            title: 'Missing id makes this a miss',
          },
        },
      })
      .mockRejectedValueOnce(createUpstreamError(404))
      .mockResolvedValueOnce({
        data: {
          feed: {
            id: '654',
            podcastGuid: 'Feed-Guid',
            url: 'http://example.com/feed.xml',
            dead: 0,
          },
        },
      });

    const provider = createProvider();
    const result = await provider.resolveFeed({
      feedGuid: 'feed-guid',
      feedUrl: 'https://example.com/feed.xml',
    });

    expect(result.status).toBe('found');
    expect(requestWithUserAgent).toHaveBeenCalledTimes(3);
    expect(requestWithUserAgent.mock.calls[1]?.[0]).toBe(
      'https://api.podcastindex.org/api/1.0/podcasts/byfeedurl?url=https%3A%2F%2Fexample.com%2Ffeed.xml'
    );
    expect(requestWithUserAgent.mock.calls[2]?.[0]).toBe(
      'https://api.podcastindex.org/api/1.0/podcasts/byfeedurl?url=http%3A%2F%2Fexample.com%2Ffeed.xml'
    );
  });

  it('resolveFeed returns not_found when all attempted keys are clean misses', async () => {
    requestWithUserAgent
      .mockRejectedValueOnce(createUpstreamError(404))
      .mockRejectedValueOnce(createUpstreamError(400))
      .mockRejectedValueOnce(createUpstreamError(404));

    const provider = createProvider();
    const result = await provider.resolveFeed({
      feedGuid: 'not-found-guid',
      feedUrl: 'https://not-found.example/feed.xml',
    });

    expect(result).toEqual({ status: 'not_found' });
  });

  it('resolveFeed returns unavailable on upstream failures that are not clean misses', async () => {
    requestWithUserAgent.mockRejectedValueOnce(createUpstreamError(500));

    const provider = createProvider();
    const result = await provider.resolveFeed({
      feedGuid: 'error-guid',
      feedUrl: 'https://fallback.example/feed.xml',
    });

    expect(result).toEqual({ status: 'unavailable' });
    expect(requestWithUserAgent).toHaveBeenCalledTimes(1);
  });

  it('resolveFeedsByGuid posts in 100-sized chunks and keys results by normalized guid', async () => {
    requestWithUserAgent
      .mockResolvedValueOnce({
        data: {
          feeds: [
            {
              id: 1,
              podcastGuid: ' GUID-001 ',
              url: 'https://feeds.example/one.xml',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          feeds: [
            {
              id: 2,
              podcastGuid: 'guid-149',
              url: 'https://feeds.example/two.xml',
            },
          ],
        },
      });

    const provider = createProvider();
    const guids = Array.from({ length: 150 }, (_value, index) => `GUID-${index}`);
    const result = await provider.resolveFeedsByGuid(guids);

    expect(result.status).toBe('found');
    if (result.status !== 'found') {
      throw new Error('Expected found result');
    }
    expect(result.value.get('guid-001')?.providerFeedId).toBe('1');
    expect(result.value.get('guid-149')?.providerFeedId).toBe('2');
    expect(requestWithUserAgent).toHaveBeenCalledTimes(2);
    expect(requestWithUserAgent.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
    });
    expect(Array.isArray(requestWithUserAgent.mock.calls[0]?.[1]?.data)).toBe(true);
    expect(requestWithUserAgent.mock.calls[0]?.[1]?.data.length).toBe(100);
    expect(requestWithUserAgent.mock.calls[1]?.[1]?.data.length).toBe(50);
  });

  it('resolveFeedsByGuid returns unavailable when any chunk request fails', async () => {
    requestWithUserAgent
      .mockResolvedValueOnce({
        data: {
          feeds: [],
        },
      })
      .mockRejectedValueOnce(createUpstreamError(500));

    const provider = createProvider();
    const guids = Array.from({ length: 150 }, (_value, index) => `GUID-${index}`);
    const result = await provider.resolveFeedsByGuid(guids);

    expect(result).toEqual({ status: 'unavailable' });
  });

  it('resolveFeedsByGuid returns an empty map without requests when input is empty', async () => {
    const provider = createProvider();
    const result = await provider.resolveFeedsByGuid([]);

    expect(result.status).toBe('found');
    if (result.status !== 'found') {
      throw new Error('Expected found result');
    }
    expect(result.value.size).toBe(0);
    expect(requestWithUserAgent).toHaveBeenCalledTimes(0);
  });

  it('getFeedById returns not_found without requests for non-numeric ids', async () => {
    const provider = createProvider();
    const result = await provider.getFeedById('abc');

    expect(result).toEqual({ status: 'not_found' });
    expect(requestWithUserAgent).toHaveBeenCalledTimes(0);
  });

  it('resolveItem maps duration and pubDate for found episodes', async () => {
    requestWithUserAgent.mockResolvedValueOnce({
      data: {
        episode: {
          id: 444,
          guid: ' episode-guid ',
          title: ' Episode title ',
          image: 'https://image.example/item.jpg',
          datePublished: 1700000000,
          itunes_duration: '01:02:03',
        },
      },
    });

    const provider = createProvider();
    const result = await provider.resolveItem({
      providerFeedId: '123',
      feedGuid: null,
      itemGuid: 'episode-guid',
    });

    expect(result.status).toBe('found');
    if (result.status !== 'found') {
      throw new Error('Expected found result');
    }
    expect(result.value.providerItemId).toBe('444');
    expect(result.value.durationSeconds).toBe(3723);
    expect(result.value.pubDate?.toISOString()).toBe('2023-11-14T22:13:20.000Z');
  });

  it('toIndexProviderFeed validates required fields and maps dead feeds', () => {
    expect(
      toIndexProviderFeed({
        podcastGuid: 'guid-only',
        url: 'https://example.com/feed.xml',
      })
    ).toBeNull();

    expect(
      toIndexProviderFeed({
        id: 123,
        podcastGuid: 'guid',
        url: 'ftp://example.com/feed.xml',
      })
    ).toBeNull();

    expect(
      toIndexProviderFeed({
        id: '123',
        podcastGuid: ' GUID-123 ',
        url: 'https://example.com/feed.xml',
        dead: 1,
      })
    ).toMatchObject({
      providerFeedId: '123',
      feedGuid: 'guid-123',
      isDead: true,
    });
  });
});
