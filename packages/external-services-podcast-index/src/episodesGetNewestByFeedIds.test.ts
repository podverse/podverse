import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ILoggerLike } from '@podverse/helpers-backend';

import { PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS, PodcastIndexService } from './index.js';

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
    maxRetries: 0,
    secretKey: 'secret-key',
    userAgent: 'test-agent',
  });
}

describe('PodcastIndexService.episodesGetNewestByFeedIds', () => {
  beforeEach(() => {
    requestWithUserAgent.mockReset();
  });

  it('requests comma-joined feed ids with newest and a max that covers every feed', async () => {
    requestWithUserAgent.mockResolvedValue({
      data: {
        status: 'true',
        items: [
          {
            id: 9001,
            feedId: 41504,
            guid: 'episode-277',
            enclosureUrl: 'https://example.com/277.mp3',
            datePublished: 1793570000,
          },
          { id: 9002, feedId: '920666', guid: '', enclosureUrl: 'https://example.com/b.mp3' },
          { id: 9003, title: 'no feed id' },
        ],
        count: 3,
      },
    });

    const result = await createService().episodesGetNewestByFeedIds([41504, 920666]);

    expect(requestWithUserAgent).toHaveBeenCalledTimes(1);
    expect(requestWithUserAgent).toHaveBeenCalledWith(
      'https://api.podcastindex.org/api/1.0/episodes/byfeedid?id=41504,920666&newest&max=2',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Auth-Key': 'auth-key',
          'X-Auth-Date': expect.any(Number),
          Authorization: expect.any(String),
        }),
      }),
      'test-agent',
      expect.objectContaining({ timeoutMs: expect.any(Number) })
    );
    expect(result).toEqual([
      {
        feedId: 41504,
        guid: 'episode-277',
        enclosureUrl: 'https://example.com/277.mp3',
        datePublished: 1793570000,
      },
      {
        feedId: 920666,
        guid: null,
        enclosureUrl: 'https://example.com/b.mp3',
        datePublished: null,
      },
    ]);
  });

  it('returns an empty list without a request for no ids, and when the body has no items', async () => {
    const service = createService();

    await expect(service.episodesGetNewestByFeedIds([])).resolves.toEqual([]);
    expect(requestWithUserAgent).not.toHaveBeenCalled();

    requestWithUserAgent.mockResolvedValue({ data: { status: 'true', count: 0 } });
    await expect(service.episodesGetNewestByFeedIds([1])).resolves.toEqual([]);
  });

  it('rejects more ids than one request accepts, and an unreadable body', async () => {
    const service = createService();
    const tooMany = Array.from(
      { length: PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS + 1 },
      (_, index) => index + 1
    );

    await expect(service.episodesGetNewestByFeedIds(tooMany)).rejects.toThrow('at most');
    expect(requestWithUserAgent).not.toHaveBeenCalled();

    requestWithUserAgent.mockResolvedValue({ data: '<html>bad gateway</html>' });
    await expect(service.episodesGetNewestByFeedIds([1])).rejects.toThrow('not an object');
  });
});
