import { describe, expect, it } from 'vitest';

import type { AddByRSSPublisherListedFeed } from '@podverse/helpers';
import type { DTOAddByRSSRemoteItemResolveResult } from '@podverse/helpers/dto';
import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';
import { convertParsedRSSFeedToCompat } from '@podverse/parser-mapping';

import { DEVICE_LISTED_REQUEST_ID_PREFIX } from '../../lib/addByRss/deviceListedFeeds';
import type { AddByRssListedFeedRecord, ListedFeedResolveRetry } from './addByRssListedFeeds';
import {
  decideListedAlbumStore,
  decideListedFeedResolve,
  directoryLookupDue,
  groupListedFeedResolveWork,
  groupPendingListedAlbums,
  isFeedListed,
  isListedFeedResolveDue,
  LISTED_FEED_RESOLVE_NO_MATCH_REASON,
  listedFeedNeedsResolve,
  listedOnlyFeedUrlsToRemove,
  nextListedFeedResolveRetry,
  toListedFeedInserts,
} from './addByRssListedFeeds';

const ARTIST_A = 'https://example.com/artist-a.xml';
const ARTIST_B = 'https://example.com/artist-b.xml';
const ALBUM_URL = 'https://example.com/album.xml';
const RELIABLE_GUID = 'e2e0de71-0000-4000-8000-0000000000b3';
const OTHER_RELIABLE_GUID = 'e2e0de71-0000-4000-8000-0000000000c4';

const shared = {
  feedUrl: null,
  title: null,
  listedAtChannelLevel: true,
  itemGuids: [],
};

const directoryEntry = (feedGuid: string, channelIdText: string): AddByRSSPublisherListedFeed => ({
  ...shared,
  feedGuid,
  kind: 'directory',
  channelIdText,
  channelTitle: 'Directory Album',
  mediumId: 3,
});

const storedRecord = (
  overrides: Partial<AddByRssListedFeedRecord> & Pick<AddByRssListedFeedRecord, 'feedGuid'>
): AddByRssListedFeedRecord => ({
  publisherFeedUrl: ARTIST_A,
  position: 0,
  kind: 'directory',
  feedUrl: null,
  title: null,
  listedAtChannelLevel: true,
  itemGuids: [],
  channelIdText: null,
  channelTitle: null,
  mediumId: null,
  imageUrl: null,
  artworkChecked: false,
  pendingRequestId: null,
  unresolvedReason: null,
  ...overrides,
});

describe('toListedFeedInserts', () => {
  it('stores each entry at its list position with a lowercased guid and its own fields', () => {
    const inserts = toListedFeedInserts(
      ARTIST_A,
      [
        { ...shared, feedGuid: 'Album-1', feedUrl: ALBUM_URL, kind: 'add_by_rss', requestId: 'r1' },
        directoryEntry('album-2', 'chan2'),
        {
          ...shared,
          feedGuid: 'album-3',
          itemGuids: ['i1'],
          kind: 'unresolved',
          listedAtChannelLevel: false,
          reason: 'item_references_only',
        },
      ],
      []
    );

    expect(inserts.map((insert) => [insert.position, insert.feedGuid, insert.kind])).toEqual([
      [0, 'album-1', 'add_by_rss'],
      [1, 'album-2', 'directory'],
      [2, 'album-3', 'unresolved'],
    ]);
    expect(inserts[0]).toMatchObject({ feedUrl: ALBUM_URL, pendingRequestId: 'r1' });
    expect(inserts[1]).toMatchObject({ channelIdText: 'chan2', mediumId: 3 });
    expect(inserts[2]).toMatchObject({
      itemGuidsJson: '["i1"]',
      listedAtChannelLevel: 0,
      unresolvedReason: 'item_references_only',
    });
  });

  it('keeps directory artwork only when the guid and the channel both match', () => {
    const existing = [
      storedRecord({
        feedGuid: 'same',
        channelIdText: 'chan1',
        imageUrl: 'https://img/1.jpg',
        artworkChecked: true,
      }),
      storedRecord({
        feedGuid: 'moved',
        channelIdText: 'chan-old',
        imageUrl: 'https://img/2.jpg',
        artworkChecked: true,
      }),
    ];

    const inserts = toListedFeedInserts(
      ARTIST_A,
      [directoryEntry('SAME', 'chan1'), directoryEntry('moved', 'chan-new')],
      existing
    );

    expect(inserts[0]).toMatchObject({ imageUrl: 'https://img/1.jpg', artworkChecked: 1 });
    expect(inserts[1]).toMatchObject({ imageUrl: null, artworkChecked: 0 });
  });
});

describe('isFeedListed', () => {
  it('matches a listing by canonical URL', () => {
    expect(
      isFeedListed({ feedUrl: 'https://example.com/', podcastGuid: null }, [
        { feedGuid: 'g', feedUrl: 'HTTPS://Example.COM' },
      ])
    ).toBe(true);
  });

  it('matches a listing by guid when the URLs differ', () => {
    expect(
      isFeedListed({ feedUrl: ALBUM_URL, podcastGuid: 'Album-Guid' }, [
        { feedGuid: 'album-guid', feedUrl: 'https://mirror.example.org/album.xml' },
      ])
    ).toBe(true);
  });

  it('does not match an unrelated listing', () => {
    expect(
      isFeedListed({ feedUrl: ALBUM_URL, podcastGuid: null }, [
        { feedGuid: 'other', feedUrl: 'https://example.com/other.xml' },
      ])
    ).toBe(false);
  });
});

describe('listedOnlyFeedUrlsToRemove', () => {
  const followedAlbum = {
    feedUrl: 'https://example.com/followed.xml',
    followed: true,
    podcastGuid: null,
  };
  const sharedAlbum = { feedUrl: ALBUM_URL, followed: false, podcastGuid: 'shared' };
  const listingA = { feedGuid: 'shared', feedUrl: ALBUM_URL, publisherFeedUrl: ARTIST_A };
  const listingB = { feedGuid: 'shared', feedUrl: null, publisherFeedUrl: ARTIST_B };

  it('never removes a followed feed', () => {
    expect(listedOnlyFeedUrlsToRemove([followedAlbum], [])).toEqual([]);
  });

  it('keeps an album two artists list while one listing remains, and removes it after both go', () => {
    expect(listedOnlyFeedUrlsToRemove([followedAlbum, sharedAlbum], [listingB])).toEqual([]);
    expect(listedOnlyFeedUrlsToRemove([followedAlbum, sharedAlbum], [listingA])).toEqual([]);
    expect(listedOnlyFeedUrlsToRemove([followedAlbum, sharedAlbum], [])).toEqual([ALBUM_URL]);
  });
});

describe('groupPendingListedAlbums', () => {
  it('fetches an album two artists list once, and remembers both listings', () => {
    const albums = groupPendingListedAlbums([
      storedRecord({
        feedGuid: 'shared',
        kind: 'add_by_rss',
        feedUrl: ALBUM_URL,
        pendingRequestId: 'r-a',
      }),
      storedRecord({
        publisherFeedUrl: ARTIST_B,
        feedGuid: 'shared',
        kind: 'add_by_rss',
        feedUrl: 'HTTPS://EXAMPLE.COM/album.xml',
        pendingRequestId: 'r-b',
        title: 'Album',
      }),
      storedRecord({ feedGuid: 'done', kind: 'add_by_rss', feedUrl: 'https://example.com/d.xml' }),
    ]);

    expect(albums).toEqual([
      {
        feedUrl: ALBUM_URL,
        requestId: 'r-a',
        title: 'Album',
        listings: [
          { publisherFeedUrl: ARTIST_A, feedGuid: 'shared', pendingRequestId: 'r-a' },
          { publisherFeedUrl: ARTIST_B, feedGuid: 'shared', pendingRequestId: 'r-b' },
        ],
      },
    ]);
  });
});

describe('decideListedAlbumStore', () => {
  const mappedFeed: AddByRSSMappedFeed = convertParsedRSSFeedToCompat({
    explicit: false,
    items: [],
    link: ALBUM_URL,
    title: 'Album',
  });
  const noRows = { hasRowForGuid: false, hasRowForUrl: false };

  it('keeps a pending album pending', () => {
    expect(
      decideListedAlbumStore({ ...noRows, result: { mappedFeed: null, status: 'pending' } })
    ).toEqual({ kind: 'keep-pending' });
  });

  it('updates the stored row when a parsed album already has one at its URL', () => {
    expect(
      decideListedAlbumStore({
        hasRowForGuid: true,
        hasRowForUrl: true,
        result: { mappedFeed, status: 'parsed' },
      })
    ).toEqual({ kind: 'update-existing' });
  });

  it('skips a parsed album already stored under another URL with the same guid', () => {
    expect(
      decideListedAlbumStore({
        hasRowForGuid: true,
        hasRowForUrl: false,
        result: { mappedFeed, status: 'parsed' },
      })
    ).toEqual({ kind: 'skip-duplicate' });
  });

  it('inserts a parsed album the device does not hold', () => {
    expect(decideListedAlbumStore({ ...noRows, result: { mappedFeed, status: 'parsed' } })).toEqual(
      { kind: 'insert-parsed' }
    );
  });

  it('stores a private album as needing credentials, including a 401 behind withheld ones', () => {
    expect(
      decideListedAlbumStore({
        ...noRows,
        result: { failureReason: 'credentials_required', mappedFeed: null, status: 'failed' },
      })
    ).toEqual({ kind: 'insert-needs-credentials' });
    expect(
      decideListedAlbumStore({
        ...noRows,
        result: {
          authChallenge: 'basic',
          failureReason: 'credentials_withheld_other_domain',
          httpStatus: 401,
          mappedFeed: null,
          status: 'failed',
        },
      })
    ).toEqual({ kind: 'insert-needs-credentials' });
    expect(
      decideListedAlbumStore({
        hasRowForGuid: false,
        hasRowForUrl: true,
        result: { failureReason: 'credentials_rejected', mappedFeed: null, status: 'failed' },
      })
    ).toEqual({ kind: 'update-existing' });
  });

  it('logs any other failure', () => {
    expect(
      decideListedAlbumStore({
        ...noRows,
        result: {
          failureReason: 'credentials_withheld_other_domain',
          httpStatus: 404,
          mappedFeed: null,
          status: 'failed',
        },
      })
    ).toEqual({ kind: 'log-failure' });
    expect(
      decideListedAlbumStore({ ...noRows, result: { mappedFeed: null, status: 'failed' } })
    ).toEqual({ kind: 'log-failure' });
  });

  it('leaves an album alone when its host answered not modified with no payload', () => {
    expect(
      decideListedAlbumStore({
        hasRowForGuid: false,
        hasRowForUrl: true,
        result: { mappedFeed: null, status: 'not_modified' },
      })
    ).toEqual({ kind: 'unchanged' });
  });

  it('still updates the stored row for not modified with a payload', () => {
    expect(
      decideListedAlbumStore({
        hasRowForGuid: false,
        hasRowForUrl: true,
        result: { mappedFeed, status: 'not_modified' },
      })
    ).toEqual({ kind: 'update-existing' });
  });
});

describe('listedFeedNeedsResolve', () => {
  const guidOnly = storedRecord({
    feedGuid: RELIABLE_GUID,
    kind: 'unresolved',
    unresolvedReason: 'no_feed_url',
  });

  it('is true only for a guid-only channel-level row the resolve can answer', () => {
    expect(listedFeedNeedsResolve(guidOnly)).toBe(true);
    expect(listedFeedNeedsResolve({ ...guidOnly, feedGuid: 'not-a-uuid' })).toBe(false);
    expect(listedFeedNeedsResolve({ ...guidOnly, listedAtChannelLevel: false })).toBe(false);
    expect(listedFeedNeedsResolve({ ...guidOnly, unresolvedReason: 'item_references_only' })).toBe(
      false
    );
  });

  it('is false once the resolve answered no match', () => {
    expect(
      listedFeedNeedsResolve({
        ...guidOnly,
        unresolvedReason: LISTED_FEED_RESOLVE_NO_MATCH_REASON,
      })
    ).toBe(false);
  });
});

describe('groupListedFeedResolveWork', () => {
  it('makes one group for a guid two artists list, whatever its case', () => {
    const groups = groupListedFeedResolveWork([
      storedRecord({ feedGuid: RELIABLE_GUID.toUpperCase(), kind: 'unresolved' }),
      storedRecord({ publisherFeedUrl: ARTIST_B, feedGuid: RELIABLE_GUID, kind: 'unresolved' }),
      storedRecord({ feedGuid: OTHER_RELIABLE_GUID, kind: 'unresolved' }),
    ]);

    expect(groups).toEqual([
      {
        feedGuid: RELIABLE_GUID,
        keys: [
          { publisherFeedUrl: ARTIST_A, feedGuid: RELIABLE_GUID.toUpperCase() },
          { publisherFeedUrl: ARTIST_B, feedGuid: RELIABLE_GUID },
        ],
      },
      {
        feedGuid: OTHER_RELIABLE_GUID,
        keys: [{ publisherFeedUrl: ARTIST_A, feedGuid: OTHER_RELIABLE_GUID }],
      },
    ]);
  });
});

describe('decideListedFeedResolve', () => {
  const newUuid = () => 'uuid-1';
  const providerFeed = (feedUrl: string): DTOAddByRSSRemoteItemResolveResult => ({
    kind: 'provider_feed',
    provider_feed: {
      index_provider: 'podcast_index',
      provider_feed_id: '42',
      feed_url: feedUrl,
      title: null,
      author: null,
      image_url: null,
    },
  });

  it('links a directory channel', () => {
    expect(
      decideListedFeedResolve(
        { kind: 'channel', channel: { id_text: 'chan1', title: 'Album', medium_id: 3 } },
        newUuid
      )
    ).toEqual({ kind: 'directory', channelIdText: 'chan1', channelTitle: 'Album', mediumId: 3 });
  });

  it('parses a provider feed on the device under its canonical URL', () => {
    expect(
      decideListedFeedResolve(providerFeed('https://User:pw@Album.Example/feed.xml'), newUuid)
    ).toEqual({
      kind: 'add_by_rss',
      feedUrl: 'https://album.example/feed.xml',
      requestId: `${DEVICE_LISTED_REQUEST_ID_PREFIX}uuid-1`,
    });
  });

  it('marks not found, and a provider feed with no usable URL, as no match', () => {
    expect(decideListedFeedResolve({ kind: 'not_found' }, newUuid)).toEqual({ kind: 'no_match' });
    expect(decideListedFeedResolve(providerFeed('not a url'), newUuid)).toEqual({
      kind: 'no_match',
    });
  });

  it('asks again later when the directory channel is not ready yet', () => {
    expect(decideListedFeedResolve({ kind: 'directory_unavailable' }, newUuid)).toEqual({
      kind: 'retry_later',
    });
  });
});

describe('nextListedFeedResolveRetry', () => {
  it('doubles the delay from one minute, caps it at 30 minutes, and stops after six retries', () => {
    const nowMs = 1_000_000;
    const delays: number[] = [];
    let retry: ListedFeedResolveRetry | undefined;
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      retry = nextListedFeedResolveRetry(retry, nowMs);
      expect(retry.attempts).toBe(attempt);
      delays.push((retry.nextAttemptAtMs ?? 0) - nowMs);
    }

    expect(delays).toEqual([60000, 120000, 240000, 480000, 960000, 1800000]);
    expect(nextListedFeedResolveRetry(retry, nowMs)).toEqual({
      attempts: 7,
      nextAttemptAtMs: null,
    });
  });
});

describe('isListedFeedResolveDue', () => {
  it('is due with no entry and at the due time, and never once attempts ran out', () => {
    expect(isListedFeedResolveDue(undefined, 0)).toBe(true);
    expect(isListedFeedResolveDue({ attempts: 1, nextAttemptAtMs: 1000 }, 999)).toBe(false);
    expect(isListedFeedResolveDue({ attempts: 1, nextAttemptAtMs: 1000 }, 1000)).toBe(true);
    expect(isListedFeedResolveDue({ attempts: 7, nextAttemptAtMs: null }, 5000)).toBe(false);
  });
});

describe('directoryLookupDue', () => {
  const match = { feedGuid: 'artist', channelIdText: 'chan', channelTitle: null, mediumId: 22 };

  it('is due when the feed was never looked up', () => {
    expect(directoryLookupDue(null, ['artist'])).toBe(true);
    expect(
      directoryLookupDue({ publisherGuids: ['artist'], directoryMatches: null }, ['artist'])
    ).toBe(true);
  });

  it('is not due when the same guids were already looked up', () => {
    expect(
      directoryLookupDue({ publisherGuids: ['artist'], directoryMatches: [match] }, ['artist'])
    ).toBe(false);
  });

  it('is due when the guids changed', () => {
    expect(
      directoryLookupDue({ publisherGuids: ['artist'], directoryMatches: [match] }, ['other'])
    ).toBe(true);
  });
});
