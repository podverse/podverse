import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ILoggerLike } from '@podverse/helpers-backend';

import { PodcastIndexService } from './index.js';

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

function createService() {
  return new PodcastIndexService({
    authKey: 'auth-key',
    baseUrl: 'https://api.podcastindex.org/api/1.0',
    loggerService: createLogger(),
    secretKey: 'secret-key',
    userAgent: 'test-agent',
  });
}

describe('PodcastIndexService.podcastGetByFeedUrl', () => {
  beforeEach(() => {
    requestWithUserAgent.mockReset();
  });

  it('returns normalized feed for a successful byfeedurl lookup and uses auth headers', async () => {
    requestWithUserAgent.mockResolvedValue({
      data: {
        feed: {
          id: 123,
          title: 'Example Feed',
          url: 'https://example.com/feed.xml',
        },
      },
    });

    const service = createService();
    const result = await service.podcastGetByFeedUrl('http://example.com/feed.xml');

    expect(result).toMatchObject({
      feedId: 123,
      podcast_index_id: 123,
      title: 'Example Feed',
      url: 'https://example.com/feed.xml',
    });

    expect(requestWithUserAgent).toHaveBeenCalledTimes(1);
    expect(requestWithUserAgent).toHaveBeenCalledWith(
      'https://api.podcastindex.org/api/1.0/podcasts/byfeedurl?url=https%3A%2F%2Fexample.com%2Ffeed.xml',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Auth-Key': 'auth-key',
          'X-Auth-Date': expect.any(Number),
          Authorization: expect.any(String),
        }),
      }),
      'test-agent',
      undefined
    );
  });

  it('falls back to the http variant when https lookup is not found', async () => {
    requestWithUserAgent
      .mockRejectedValueOnce({
        response: { status: 404 },
      })
      .mockResolvedValueOnce({
        data: {
          feed: {
            id: 456,
            title: 'HTTP Feed',
            url: 'http://example.com/feed.xml',
          },
        },
      });

    const service = createService();
    const result = await service.podcastGetByFeedUrl('http://example.com/feed.xml');

    expect(result).toMatchObject({
      feedId: 456,
      podcast_index_id: 456,
      title: 'HTTP Feed',
      url: 'http://example.com/feed.xml',
    });
    expect(requestWithUserAgent).toHaveBeenCalledTimes(2);
    expect(requestWithUserAgent.mock.calls[0]?.[0]).toBe(
      'https://api.podcastindex.org/api/1.0/podcasts/byfeedurl?url=https%3A%2F%2Fexample.com%2Ffeed.xml'
    );
    expect(requestWithUserAgent.mock.calls[1]?.[0]).toBe(
      'https://api.podcastindex.org/api/1.0/podcasts/byfeedurl?url=http%3A%2F%2Fexample.com%2Ffeed.xml'
    );
  });

  it('returns null for invalid input, 404s, or empty feed envelopes', async () => {
    const service = createService();
    await expect(service.podcastGetByFeedUrl('')).resolves.toBeNull();
    expect(requestWithUserAgent).toHaveBeenCalledTimes(0);

    requestWithUserAgent.mockRejectedValue({
      response: { status: 404 },
    });
    await expect(
      service.podcastGetByFeedUrl('https://not-found.example/feed.xml')
    ).resolves.toBeNull();
    expect(requestWithUserAgent).toHaveBeenCalledTimes(2);

    requestWithUserAgent.mockReset();
    requestWithUserAgent.mockResolvedValue({ data: { status: 'true' } });
    await expect(service.podcastGetByFeedUrl('https://empty.example/feed.xml')).resolves.toBeNull();
    expect(requestWithUserAgent).toHaveBeenCalledTimes(2);
  });
});
