import { describe, expect, it, vi } from 'vitest';

import type { PodcastBatchByFeedGuidResponse, RemoteItemGeneric } from '@podverse/helpers';

import { enrichMissedChannelsUnaddedByFeedUrl } from './remoteItems.js';

type PodcastIndexFeed = PodcastBatchByFeedGuidResponse['feeds'][number];

function feed(partial: Partial<PodcastIndexFeed> & { id: number }): PodcastIndexFeed {
  return {
    artwork: '',
    author: '',
    contentType: 'application/rss+xml',
    crawlErrors: 0,
    dead: 0,
    description: '',
    episodeCount: 0,
    image: '',
    itunesId: null,
    lastCrawlTime: 0,
    lastGoodHttpStatusTime: 0,
    lastHttpStatus: 200,
    lastParseTime: 0,
    lastUpdateTime: 0,
    link: '',
    originalUrl: partial.url ?? '',
    ownerName: '',
    parseErrors: 0,
    podcastGuid: partial.podcastGuid ?? '',
    title: partial.title ?? '',
    url: partial.url ?? '',
    ...partial,
  };
}

describe('enrichMissedChannelsUnaddedByFeedUrl', () => {
  it('looks up missed refs by feed_url and skips local urls and already-merged guids', async () => {
    const lookup = vi.fn(async (feedUrl: string) => {
      if (feedUrl === 'https://example.com/missed.xml') {
        return feed({
          id: 99,
          podcastGuid: 'missed-guid',
          title: 'Missed Album',
          url: feedUrl,
        });
      }
      return null;
    });

    const original: RemoteItemGeneric[] = [
      {
        feed_guid: 'already-found',
        feed_url: 'https://example.com/found.xml',
        item_guid: null,
      },
      {
        feed_guid: 'missing-guid',
        feed_url: 'https://example.com/missed.xml',
        item_guid: null,
      },
      {
        feed_guid: 'local-guid',
        feed_url: 'http://localhost:2111/album.xml',
        item_guid: null,
      },
    ];

    const alreadyMerged = [
      feed({
        id: 1,
        podcastGuid: 'already-found',
        title: 'Found',
        url: 'https://example.com/found.xml',
      }),
    ];

    const extras = await enrichMissedChannelsUnaddedByFeedUrl(original, alreadyMerged, lookup);

    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith('https://example.com/missed.xml');
    expect(extras).toHaveLength(1);
    expect(extras[0]?.id).toBe(99);
    expect(extras[0]?.title).toBe('Missed Album');
  });

  it('dedupes by podcast index id and does not call lookup twice for the same url', async () => {
    const lookup = vi.fn(async () =>
      feed({
        id: 42,
        podcastGuid: 'g-42',
        title: 'Album',
        url: 'https://example.com/album.xml',
      })
    );

    const original: RemoteItemGeneric[] = [
      {
        feed_guid: 'a',
        feed_url: 'https://example.com/album.xml',
        item_guid: null,
      },
      {
        feed_guid: 'b',
        feed_url: 'https://example.com/album.xml',
        item_guid: null,
      },
    ];

    const extras = await enrichMissedChannelsUnaddedByFeedUrl(original, [], lookup);

    expect(lookup).toHaveBeenCalledTimes(1);
    expect(extras).toHaveLength(1);
  });

  it('skips feeds that lack a positive podcast index id', async () => {
    const lookup = vi.fn(async () => feed({ id: 0, title: 'Bad', url: 'https://example.com/x.xml' }));

    const extras = await enrichMissedChannelsUnaddedByFeedUrl(
      [
        {
          feed_guid: 'x',
          feed_url: 'https://example.com/x.xml',
          item_guid: null,
        },
      ],
      [],
      lookup
    );

    expect(extras).toEqual([]);
  });
});
