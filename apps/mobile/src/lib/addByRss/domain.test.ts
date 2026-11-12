import { describe, expect, it, vi } from 'vitest';

import type { AddByRSSParseCacheEntry, AddByRSSPublisherListedFeed } from '@podverse/helpers';
import { getAddByRSSHashId } from '@podverse/helpers';
import { convertParsedRSSFeedToCompat, Phase4LiveStatus } from '@podverse/parser-mapping';

import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import {
  buildAddByRssFeedRecord,
  extractPreviewFromParsePayload,
  localFeedForServerFollow,
  mapParsedFeedToPreview,
  mergeLocalAndRemoteAddByRssFeeds,
  pollAddByRssParseStatus,
  toAddByRssLiveItemPlaybackResourceData,
} from './domain';
import { addByRssPlaybackMediaId } from './resourceData';

const localFeed = (
  overrides: Partial<MobileAddByRSSFeedRecord> = {}
): MobileAddByRSSFeedRecord => ({
  enclosureUrl: null,
  feedUrl: 'https://e2e-seed-addbyrss.example/podcast.xml',
  id: 1,
  idText: 'rss-1',
  imageUrl: null,
  latestItemPubDateMs: null,
  playbackPosition: null,
  resourceType: 'podcasts',
  title: 'E2E Add-by-RSS Channel',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('localFeedForServerFollow', () => {
  const follow = {
    feed_url: 'https://example.com/moved.xml',
    image_url: 'https://example.com/art.jpg',
    title: 'Moved Show',
  };

  it('creates one local row from the follow and leaves an existing row alone', () => {
    const created = localFeedForServerFollow(follow, null);

    expect(created).not.toBeNull();
    expect(created?.feedUrl).toBe(follow.feed_url);
    expect(created?.title).toBe('Moved Show');
    expect(created?.imageUrl).toBe('https://example.com/art.jpg');
    if (created === null) {
      return;
    }
    expect(localFeedForServerFollow(follow, created)).toBeNull();
  });
});

describe('mergeLocalAndRemoteAddByRssFeeds', () => {
  it('keeps a parsed local title when the followed list still has the feed URL', () => {
    const feedUrl = 'https://e2e-seed-addbyrss.example/podcast.xml';
    const merged = mergeLocalAndRemoteAddByRssFeeds(
      [localFeed({ feedUrl })],
      [{ feed_url: feedUrl, image_url: null, title: feedUrl }]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe('E2E Add-by-RSS Channel');
  });

  it('uses the followed title when this device has not parsed the feed yet', () => {
    const merged = mergeLocalAndRemoteAddByRssFeeds(
      [],
      [
        {
          feed_url: 'https://example.com/feed.xml',
          image_url: null,
          title: 'Remote Title',
        },
      ]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe('Remote Title');
  });

  it('takes the credential flag from the account and keeps this device’s last auth failure', () => {
    const feedUrl = 'https://example.com/private.xml';
    const [flaggedElsewhere] = mergeLocalAndRemoteAddByRssFeeds(
      [],
      [{ feed_url: feedUrl, image_url: null, requires_credentials: true, title: null }]
    );
    expect(flaggedElsewhere?.requiresCredentials).toBe(true);
    expect(flaggedElsewhere?.lastAuthFailure).toBeNull();

    const [rejectedHere] = mergeLocalAndRemoteAddByRssFeeds(
      [localFeed({ feedUrl, lastAuthFailure: 'credentials_rejected', requiresCredentials: true })],
      [{ feed_url: feedUrl, image_url: null, title: null }]
    );
    expect(rejectedHere?.requiresCredentials).toBe(true);
    expect(rejectedHere?.lastAuthFailure).toBe('credentials_rejected');
  });

  it('keeps a stored album type and treats an unparsed follow as a podcast', () => {
    const feedUrl = 'https://example.com/album.xml';
    const [kept] = mergeLocalAndRemoteAddByRssFeeds(
      [localFeed({ feedUrl, resourceType: 'albums' })],
      [{ feed_url: feedUrl, image_url: null, title: 'Album' }]
    );
    expect(kept?.resourceType).toBe('albums');

    const [remoteOnly] = mergeLocalAndRemoteAddByRssFeeds(
      [],
      [{ feed_url: 'https://example.com/new.xml', image_url: null, title: 'New' }]
    );
    expect(remoteOnly?.resourceType).toBe('podcasts');
    expect(remoteOnly?.followed).toBe(true);
  });

  it('reuses a listed-only row when the account follows that feed', () => {
    const feedUrl = 'https://example.com/album.xml';
    const merged = mergeLocalAndRemoteAddByRssFeeds(
      [localFeed({ feedUrl, followed: false, id: 7, idText: 'rss-listed' })],
      [{ feed_url: feedUrl, image_url: null, title: 'Album' }]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe(7);
    expect(merged[0]?.idText).toBe('rss-listed');
    expect(merged[0]?.followed).toBe(true);
  });

  it('omits a listed-only row the account does not follow', () => {
    const merged = mergeLocalAndRemoteAddByRssFeeds(
      [localFeed({ followed: false, idText: 'rss-listed' })],
      [{ feed_url: 'https://example.com/other.xml', image_url: null, title: 'Other' }]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.feedUrl).toBe('https://example.com/other.xml');
    expect(merged.map((feed) => feed.idText)).not.toContain('rss-listed');
  });

  it('collapses a local row that differs only by a trailing path slash', () => {
    const merged = mergeLocalAndRemoteAddByRssFeeds(
      [localFeed({ feedUrl: 'https://example.com/feed/show/', idText: 'rss-slash' })],
      [{ feed_url: 'https://example.com/feed/show', image_url: null, title: 'Show' }]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.feedUrl).toBe('https://example.com/feed/show');
    expect(merged[0]?.idText).toBe('rss-slash');
  });

  it('keeps a followed local row the account does not follow', () => {
    const merged = mergeLocalAndRemoteAddByRssFeeds(
      [
        localFeed({ feedUrl: 'https://example.com/a.xml', followed: true, idText: 'rss-a' }),
        localFeed({ feedUrl: 'https://example.com/b.xml', idText: 'rss-b' }),
      ],
      []
    );

    expect(merged.map((feed) => feed.idText)).toEqual(['rss-a', 'rss-b']);
  });
});

describe('buildAddByRssFeedRecord', () => {
  const preview = {
    enclosureUrl: null,
    imageUrl: null,
    latestItemPubDateMs: null,
    playbackPosition: null,
    title: 'Artist',
  };

  it('keeps an existing artists type and defaults a new record to podcasts', () => {
    const existing = localFeed({ resourceType: 'artists' });

    expect(buildAddByRssFeedRecord(existing.feedUrl, existing, preview).resourceType).toBe(
      'artists'
    );
    expect(
      buildAddByRssFeedRecord('https://example.com/new.xml', undefined, preview).resourceType
    ).toBe('podcasts');
  });
});

const rawParsePayload = {
  items: [
    {
      enclosure: { length: 100, type: 'audio/mpeg', url: 'https://example.com/episode.mp3' },
      guid: 'episode-1',
      title: 'Episode One',
    },
  ],
  title: 'Show Name',
};

describe('add-by-RSS parse previews', () => {
  it('titles the feed record with the channel title, not its first episode', () => {
    const mappedFeed = convertParsedRSSFeedToCompat({
      explicit: false,
      items: [
        {
          duration: 60,
          enclosure: { length: 100, type: 'audio/mpeg', url: 'https://example.com/episode.mp3' },
          explicit: false,
          guid: 'episode-1',
          pubDate: new Date('2026-01-01T00:00:00.000Z'),
          title: 'Episode One',
        },
      ],
      link: 'https://example.com/feed.xml',
      title: 'Show Name',
    });

    expect(mapParsedFeedToPreview(mappedFeed).title).toBe('Show Name');
  });

  it('prefers the channel title in the raw payload fallback too', () => {
    expect(extractPreviewFromParsePayload(rawParsePayload).title).toBe('Show Name');
  });

  it('falls back to the first episode title when the feed has no channel title', () => {
    expect(extractPreviewFromParsePayload({ ...rawParsePayload, title: '  ' }).title).toBe(
      'Episode One'
    );
  });
});

describe('pollAddByRssParseStatus', () => {
  const statusEntry = (
    overrides: Partial<AddByRSSParseCacheEntry<unknown>>
  ): AddByRSSParseCacheEntry<unknown> => ({
    accountId: 1,
    feedUrl: 'https://example.com/artist.xml',
    requestId: 'r1',
    status: 'parsed',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });
  const listed: AddByRSSPublisherListedFeed[] = [
    {
      feedGuid: 'album-1',
      feedUrl: 'https://example.com/album.xml',
      itemGuids: [],
      kind: 'add_by_rss',
      listedAtChannelLevel: true,
      requestId: 'album-request',
      title: 'Album',
    },
  ];

  it('surfaces the list a parsed artist status carries', async () => {
    const result = await pollAddByRssParseStatus('r1', async () =>
      statusEntry({ publisherListedFeeds: listed })
    );

    expect(result.status).toBe('parsed');
    expect(result.publisherListedFeeds).toEqual(listed);
  });

  it('leaves the list undefined when the status carries none', async () => {
    const result = await pollAddByRssParseStatus('r1', async () => statusEntry({}));

    expect(result.status).toBe('parsed');
    expect(result.publisherListedFeeds).toBeUndefined();
  });

  it('reads once and returns pending without sleeping when asked for one attempt', async () => {
    const fetchStatus = vi.fn(async () => statusEntry({ status: 'queued' }));

    // A sleep of this length would outlast the test timeout.
    const result = await pollAddByRssParseStatus('r1', fetchStatus, {
      attempts: 1,
      delayMs: 60000,
    });

    expect(fetchStatus).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('pending');
  });
});

describe('toAddByRssLiveItemPlaybackResourceData', () => {
  it('keeps the canonical feed url and the stored playback position, and hashes like a livestream row', () => {
    const record = localFeed({
      feedUrl: 'https://user:secret@example.com/show.xml',
      playbackPosition: '125',
    });
    const mappedFeed = convertParsedRSSFeedToCompat({
      explicit: false,
      items: [],
      link: 'https://example.com',
      podcastLiveItems: [
        {
          contentLinks: [],
          enclosure: { length: 1, type: 'audio/mpeg', url: 'https://example.com/live.mp3' },
          guid: 'studio-live',
          start: new Date('2026-06-01T15:00:00.000Z'),
          status: Phase4LiveStatus.Live,
        },
      ],
      title: 'Show',
    });
    const liveBundle = mappedFeed.liveItems[0];
    expect(liveBundle).toBeDefined();
    if (liveBundle === undefined) {
      return;
    }

    const data = toAddByRssLiveItemPlaybackResourceData(record, mappedFeed, liveBundle, 0);

    expect(data.feed_url).toBe('https://example.com/show.xml');
    expect(data.playback_position).toBe('125');
    expect(addByRssPlaybackMediaId(data)).toBe(
      getAddByRSSHashId({ feed_url: 'https://example.com/show.xml', guid: 'studio-live' })
    );
  });
});
