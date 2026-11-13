import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  deleteCredentialsMock,
  getAddByRSSFeedByUrlMock,
  getAddByRSSParseStatusMock,
  pruneAddByRSSPublisherDataMock,
  removeAddByRSSFeedMock,
  unfollowAddByRSSFeedsBulkMock,
  upsertAddByRSSFeedMock,
} = vi.hoisted(() => ({
  deleteCredentialsMock: vi.fn(),
  getAddByRSSFeedByUrlMock: vi.fn(),
  getAddByRSSParseStatusMock: vi.fn(),
  pruneAddByRSSPublisherDataMock: vi.fn(),
  removeAddByRSSFeedMock: vi.fn(),
  unfollowAddByRSSFeedsBulkMock: vi.fn(),
  upsertAddByRSSFeedMock: vi.fn(),
}));

vi.mock('./api', () => ({
  enqueueAddByRSSParse: vi.fn(),
  followAddByRSSChannel: vi.fn(),
  getAddByRSSParseStatus: getAddByRSSParseStatusMock,
  unfollowAddByRSSChannel: vi.fn(),
  unfollowAddByRSSFeedsBulk: unfollowAddByRSSFeedsBulkMock,
}));

vi.mock('./storage', () => ({
  getAddByRSSFeedByUrl: getAddByRSSFeedByUrlMock,
  removeAddByRSSFeed: removeAddByRSSFeedMock,
  upsertAddByRSSFeed: upsertAddByRSSFeedMock,
}));

vi.mock('./credentialStore', async () => {
  const actual = await vi.importActual<typeof import('./credentialStore')>('./credentialStore');
  return {
    ...actual,
    deleteCredentials: deleteCredentialsMock,
  };
});

vi.mock('./listedFeeds', async () => {
  const actual = await vi.importActual<typeof import('./listedFeeds')>('./listedFeeds');
  return {
    ...actual,
    pruneAddByRSSPublisherData: pruneAddByRSSPublisherDataMock,
  };
});

import { FeedType, Phase4LiveStatus, Phase5Blocked } from 'podverse-partytime/core';

import { getBackgroundActivitySnapshot } from '../backgroundActivity/backgroundActivityStore';
import {
  applyAddByRSSParseStatus,
  pollAddByRSSParseStatus,
  unfollowAddByRSSArtistAndAlbums,
} from './actions';
import type { AddByRSSFeedRecord, AddByRSSParsedFeed } from './types';

const parsedFeed = (withLiveItem: boolean): AddByRSSParsedFeed => ({
  type: FeedType.RSS,
  title: 'Test Feed',
  link: 'https://example.com',
  description: 'A feed',
  explicit: false,
  itunesBlock: false,
  itunesComplete: false,
  pc20support: {},
  items: [],
  lastUpdate: new Date('2024-01-01T00:00:00.000Z'),
  podcastBlocked: Phase5Blocked.No,
  podcastLiveItems: withLiveItem
    ? [
        {
          guid: 'live-1',
          title: 'Live now',
          enclosure: {
            url: 'https://example.com/live.mp3',
            length: 1,
            type: 'audio/mpeg',
          },
          status: Phase4LiveStatus.Live,
          start: new Date('2024-06-01T12:00:00.000Z'),
          contentLinks: [],
        },
      ]
    : undefined,
});

const baseRecord: AddByRSSFeedRecord = {
  id: 1,
  idText: 'test-id',
  resourceType: 'podcasts',
  feedUrl: 'https://example.com/feed.xml',
  title: 'Test Feed',
  imageUrl: null,
  status: 'queued',
  updatedAt: '2024-01-01T00:00:00.000Z',
  lastParsedAt: '2024-01-01T00:00:00.000Z',
  lastFailedParseAt: null,
};

describe('applyAddByRSSParseStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAddByRSSFeedByUrlMock.mockResolvedValue(baseRecord);
    upsertAddByRSSFeedMock.mockResolvedValue(undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets lastFailedParseAt to the same timestamp as updatedAt when status is failed', async () => {
    await applyAddByRSSParseStatus({
      feedUrl: baseRecord.feedUrl,
      parsedFeed: undefined,
      status: 'failed',
    });

    expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        updatedAt: '2024-06-01T12:00:00.000Z',
        lastFailedParseAt: '2024-06-01T12:00:00.000Z',
      })
    );
  });

  it('updates lastParsedAt and preserves lastFailedParseAt when status is parsed', async () => {
    getAddByRSSFeedByUrlMock.mockResolvedValue({
      ...baseRecord,
      lastFailedParseAt: '2024-05-01T00:00:00.000Z',
    });

    await applyAddByRSSParseStatus({
      feedUrl: baseRecord.feedUrl,
      parsedFeed: undefined,
      status: 'parsed',
    });

    expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lastParsedAt: '2024-06-01T12:00:00.000Z',
        lastFailedParseAt: '2024-05-01T00:00:00.000Z',
      })
    );
  });

  it('updates lastParsedAt and preserves lastFailedParseAt when status is not_modified', async () => {
    getAddByRSSFeedByUrlMock.mockResolvedValue({
      ...baseRecord,
      lastFailedParseAt: '2024-05-01T00:00:00.000Z',
    });

    await applyAddByRSSParseStatus({
      feedUrl: baseRecord.feedUrl,
      parsedFeed: undefined,
      status: 'not_modified',
    });

    expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lastParsedAt: '2024-06-01T12:00:00.000Z',
        lastFailedParseAt: '2024-05-01T00:00:00.000Z',
      })
    );
  });

  it('records a credential failure and flags the feed so the list asks for credentials', async () => {
    await applyAddByRSSParseStatus({
      feedUrl: baseRecord.feedUrl,
      parsedFeed: undefined,
      status: 'failed',
      outcome: { failureReason: 'credentials_rejected', credentialsState: 'sent' },
    });

    expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lastFailureReason: 'credentials_rejected',
        requiresCredentials: true,
      })
    );
  });

  it('clears the last failure reason when a parse succeeds', async () => {
    getAddByRSSFeedByUrlMock.mockResolvedValue({
      ...baseRecord,
      requiresCredentials: true,
      lastFailureReason: 'credentials_rejected',
    });

    await applyAddByRSSParseStatus({
      feedUrl: baseRecord.feedUrl,
      parsedFeed: undefined,
      status: 'parsed',
      outcome: { credentialsState: 'sent' },
    });

    expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lastFailureReason: null,
        requiresCredentials: true,
      })
    );
  });

  it('keeps the last failure reason while a new parse is in progress', async () => {
    getAddByRSSFeedByUrlMock.mockResolvedValue({
      ...baseRecord,
      lastFailureReason: 'credentials_required',
    });

    await applyAddByRSSParseStatus({
      feedUrl: baseRecord.feedUrl,
      parsedFeed: undefined,
      status: 'queued',
    });

    expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({ lastFailureReason: 'credentials_required' })
    );
  });

  it('stores mayHaveLivestreams for a live item and keeps resourceType', async () => {
    await applyAddByRSSParseStatus({
      feedUrl: baseRecord.feedUrl,
      parsedFeed: parsedFeed(true),
      status: 'parsed',
    });

    expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mayHaveLivestreams: true,
        resourceType: 'podcasts',
      })
    );
  });

  it('keeps mayHaveLivestreams after a parse that has no live items', async () => {
    getAddByRSSFeedByUrlMock.mockResolvedValue({
      ...baseRecord,
      mayHaveLivestreams: true,
    });

    await applyAddByRSSParseStatus({
      feedUrl: baseRecord.feedUrl,
      parsedFeed: parsedFeed(false),
      status: 'parsed',
    });

    expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({ mayHaveLivestreams: true })
    );
  });

  it('preserves lastFailedParseAt on non-failure statuses', async () => {
    getAddByRSSFeedByUrlMock.mockResolvedValue({
      ...baseRecord,
      lastFailedParseAt: '2024-05-01T00:00:00.000Z',
    });

    await applyAddByRSSParseStatus({
      feedUrl: baseRecord.feedUrl,
      parsedFeed: undefined,
      status: 'processing',
    });

    expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lastFailedParseAt: '2024-05-01T00:00:00.000Z',
      })
    );
  });
});

describe('pollAddByRSSParseStatus', () => {
  beforeEach(() => {
    vi.useRealTimers();
    getAddByRSSParseStatusMock.mockReset();
  });

  it('counts the pending poll and clears it once parsed', async () => {
    let resolveStatus: (value: { status: 'parsed' }) => void = () => {
      throw new Error('Parse status request was not pending.');
    };
    const pendingStatus = new Promise<{ status: 'parsed' }>((resolve) => {
      resolveStatus = resolve;
    });
    getAddByRSSParseStatusMock.mockReturnValueOnce(pendingStatus);

    const poll = pollAddByRSSParseStatus({
      requestId: 'req-1',
      onStatusUpdate: vi.fn(),
    });

    expect(getBackgroundActivitySnapshot()).toEqual([
      { kind: 'add_by_rss_refresh', completed: 0, total: 1 },
    ]);

    resolveStatus({ status: 'parsed' });
    await expect(poll).resolves.toBe('parsed');
    expect(getBackgroundActivitySnapshot()).toEqual([]);
  });

  it('clears the snapshot when the status request rejects', async () => {
    getAddByRSSParseStatusMock.mockRejectedValueOnce(new Error('status failed'));

    await expect(
      pollAddByRSSParseStatus({
        requestId: 'req-1',
        onStatusUpdate: vi.fn(),
      })
    ).rejects.toThrow('status failed');
    expect(getBackgroundActivitySnapshot()).toEqual([]);
  });
});

describe('unfollowAddByRSSArtistAndAlbums', () => {
  const account = { id_text: 'acct' };
  const albums = {
    addByRSSFeeds: [
      { feedUrl: 'https://album-a.example/feed.xml', idText: 'album-a' },
      { feedUrl: 'https://album-b.example/feed.xml', idText: 'album-b' },
    ],
    directoryChannelIdTexts: ['dir-album'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    unfollowAddByRSSFeedsBulkMock.mockResolvedValue(account);
    removeAddByRSSFeedMock.mockResolvedValue(undefined);
    deleteCredentialsMock.mockResolvedValue(undefined);
    pruneAddByRSSPublisherDataMock.mockResolvedValue([]);
  });

  it('unfollows the artist first, then each album, and prunes once', async () => {
    const result = await unfollowAddByRSSArtistAndAlbums({
      accountId: 'acct',
      artist: { feedUrl: 'https://artist.example/feed.xml', idText: 'artist-id' },
      albums,
    });

    expect(unfollowAddByRSSFeedsBulkMock).toHaveBeenCalledWith({
      feedUrls: [
        'https://artist.example/feed.xml',
        'https://album-a.example/feed.xml',
        'https://album-b.example/feed.xml',
      ],
      channelIdTexts: ['dir-album'],
    });
    expect(removeAddByRSSFeedMock).toHaveBeenNthCalledWith(1, 'artist-id');
    expect(removeAddByRSSFeedMock).toHaveBeenNthCalledWith(2, 'album-a');
    expect(removeAddByRSSFeedMock).toHaveBeenNthCalledWith(3, 'album-b');
    expect(deleteCredentialsMock).toHaveBeenNthCalledWith(
      1,
      'acct',
      'https://artist.example/feed.xml'
    );
    expect(deleteCredentialsMock).toHaveBeenNthCalledWith(
      2,
      'acct',
      'https://album-a.example/feed.xml'
    );
    expect(deleteCredentialsMock).toHaveBeenNthCalledWith(
      3,
      'acct',
      'https://album-b.example/feed.xml'
    );
    expect(pruneAddByRSSPublisherDataMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(account);

    const bulkOrder = unfollowAddByRSSFeedsBulkMock.mock.invocationCallOrder[0];
    const firstRemoveOrder = removeAddByRSSFeedMock.mock.invocationCallOrder[0];
    const lastRemoveOrder = removeAddByRSSFeedMock.mock.invocationCallOrder[2];
    const pruneOrder = pruneAddByRSSPublisherDataMock.mock.invocationCallOrder[0];
    if (
      bulkOrder === undefined ||
      firstRemoveOrder === undefined ||
      lastRemoveOrder === undefined ||
      pruneOrder === undefined
    ) {
      throw new Error('Unfollow call order was missing.');
    }
    expect(bulkOrder).toBeLessThan(firstRemoveOrder);
    expect(lastRemoveOrder).toBeLessThan(pruneOrder);
  });

  it('removes nothing and propagates when the bulk unfollow rejects', async () => {
    const error = new Error('bulk failed');
    unfollowAddByRSSFeedsBulkMock.mockRejectedValue(error);

    await expect(
      unfollowAddByRSSArtistAndAlbums({
        accountId: 'acct',
        artist: { feedUrl: 'https://artist.example/feed.xml', idText: 'artist-id' },
        albums,
      })
    ).rejects.toBe(error);
    expect(removeAddByRSSFeedMock).not.toHaveBeenCalled();
    expect(deleteCredentialsMock).not.toHaveBeenCalled();
    expect(pruneAddByRSSPublisherDataMock).not.toHaveBeenCalled();
  });
});
