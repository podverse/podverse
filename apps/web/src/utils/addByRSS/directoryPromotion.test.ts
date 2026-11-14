import { FeedType, Phase5Blocked } from 'podverse-partytime/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS } from '@podverse/helpers';
import { convertParsedRSSFeedToCompat } from '@podverse/parser-mapping';

import type { AddByRSSFeedRecord, AddByRSSParsedFeed } from './types';

const {
  convertAddByRSSFeedMock,
  emitAddByRSSFeedChangedMock,
  emitQueueDataChangedEventMock,
  matchAddByRSSFeedsMock,
  removeAddByRSSFeedMock,
} = vi.hoisted(() => ({
  convertAddByRSSFeedMock: vi.fn(),
  emitAddByRSSFeedChangedMock: vi.fn(),
  emitQueueDataChangedEventMock: vi.fn(),
  matchAddByRSSFeedsMock: vi.fn(),
  removeAddByRSSFeedMock: vi.fn(),
}));

vi.mock('./api', () => ({
  convertAddByRSSFeed: convertAddByRSSFeedMock,
  matchAddByRSSFeeds: matchAddByRSSFeedsMock,
}));

vi.mock('./storage', () => ({
  removeAddByRSSFeed: removeAddByRSSFeedMock,
}));

vi.mock('./feedChangedEvent', () => ({
  emitAddByRSSFeedChanged: emitAddByRSSFeedChangedMock,
}));

vi.mock('../../lib/queue/queueDataChanged', () => ({
  emitQueueDataChangedEvent: emitQueueDataChangedEventMock,
}));

const HOUR_MS = 60 * 60 * 1000;
const START = new Date('2026-06-01T12:00:00.000Z');

const directoryChannel = {
  id_text: 'dirChan01',
  title: 'Directory Show',
  medium_id: 2,
};

const feed = (
  feedUrl: string,
  overrides: Partial<AddByRSSFeedRecord> = {}
): AddByRSSFeedRecord => ({
  id: feedUrl.length,
  idText: `id-${feedUrl.length}`,
  resourceType: 'podcasts',
  feedUrl,
  title: 'Show',
  imageUrl: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const matched = (feedUrl: string) => ({
  feed_url: feedUrl,
  channel: directoryChannel,
  items: [],
});

const converted = {
  converted: true as const,
  channel: directoryChannel,
  items: [],
  queue_rows_moved: 1,
  queue_rows_dropped: 0,
  playlist_rows_moved: 0,
  playlist_rows_dropped: 0,
};

let promoteMatchingAddByRSSFeeds: typeof import('./directoryPromotion').promoteMatchingAddByRSSFeeds;

describe('promoteMatchingAddByRSSFeeds', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(START);
    vi.resetModules();
    removeAddByRSSFeedMock.mockResolvedValue(undefined);
    ({ promoteMatchingAddByRSSFeeds } = await import('./directoryPromotion'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks the directory at most once an hour unless the refresh is forced', async () => {
    const show = feed('https://example.com/show.xml');
    matchAddByRSSFeedsMock.mockResolvedValue({ matches: [] });

    await promoteMatchingAddByRSSFeeds({ feeds: [show], force: false });
    vi.setSystemTime(START.getTime() + 60_000);
    await promoteMatchingAddByRSSFeeds({ feeds: [show], force: false });
    expect(matchAddByRSSFeedsMock).toHaveBeenCalledTimes(1);

    await promoteMatchingAddByRSSFeeds({ feeds: [show], force: true });
    expect(matchAddByRSSFeedsMock).toHaveBeenCalledTimes(2);

    vi.setSystemTime(START.getTime() + 60_000 + HOUR_MS);
    await promoteMatchingAddByRSSFeeds({ feeds: [show], force: false });
    expect(matchAddByRSSFeedsMock).toHaveBeenCalledTimes(3);
  });

  it('skips credentialed feeds and feeds whose URL carries a username', async () => {
    const show = feed('https://example.com/show.xml');
    matchAddByRSSFeedsMock.mockResolvedValue({ matches: [] });

    await promoteMatchingAddByRSSFeeds({
      feeds: [
        show,
        feed('https://example.com/secret.xml', { requiresCredentials: true }),
        feed('https://alice:pw@example.com/private.xml'),
      ],
      force: true,
    });

    expect(matchAddByRSSFeedsMock).toHaveBeenCalledWith([
      { feed_url: show.feedUrl, feed_guid: null, items: [] },
    ]);
  });

  it('removes the local record when the feed converts and reloads the queue', async () => {
    const parsed: AddByRSSParsedFeed = {
      type: FeedType.RSS,
      title: 'Show',
      link: 'https://example.com',
      description: 'A feed',
      explicit: false,
      itunesBlock: false,
      itunesComplete: false,
      pc20support: {},
      guid: 'podcast-guid',
      items: [],
      lastUpdate: new Date('2024-01-01T00:00:00.000Z'),
      podcastBlocked: Phase5Blocked.No,
    };
    const mappedFeed = convertParsedRSSFeedToCompat(parsed);
    const show = feed('https://example.com/show.xml', { mappedFeed });
    matchAddByRSSFeedsMock.mockResolvedValue({ matches: [matched(show.feedUrl)] });
    convertAddByRSSFeedMock.mockResolvedValue(converted);

    const result = await promoteMatchingAddByRSSFeeds({ feeds: [show], force: true });

    expect(convertAddByRSSFeedMock).toHaveBeenCalledWith({
      feed_url: show.feedUrl,
      feed_guid: mappedFeed.channel.channel.podcast_guid,
    });
    expect(removeAddByRSSFeedMock).toHaveBeenCalledWith(show.idText);
    expect(emitAddByRSSFeedChangedMock).toHaveBeenCalledWith(show.feedUrl);
    expect(emitQueueDataChangedEventMock).toHaveBeenCalledTimes(1);
    expect(result.convertedFeedUrls).toEqual([show.feedUrl]);
  });

  it('removes the local record when the account no longer follows the feed', async () => {
    const show = feed('https://example.com/show.xml');
    matchAddByRSSFeedsMock.mockResolvedValue({ matches: [matched(show.feedUrl)] });
    convertAddByRSSFeedMock.mockResolvedValue({
      converted: false,
      reason: 'not_followed',
      channel: null,
    });

    const result = await promoteMatchingAddByRSSFeeds({ feeds: [show], force: true });

    expect(removeAddByRSSFeedMock).toHaveBeenCalledWith(show.idText);
    expect(result.convertedFeedUrls).toEqual([show.feedUrl]);
  });

  it('keeps the local record when the follow tier is full', async () => {
    const show = feed('https://example.com/show.xml');
    matchAddByRSSFeedsMock.mockResolvedValue({ matches: [matched(show.feedUrl)] });
    convertAddByRSSFeedMock.mockResolvedValue({
      converted: false,
      reason: 'follow_limit',
      channel: null,
    });

    const result = await promoteMatchingAddByRSSFeeds({ feeds: [show], force: true });

    expect(removeAddByRSSFeedMock).not.toHaveBeenCalled();
    expect(result.convertedFeedUrls).toEqual([]);
  });

  it('keeps the local record when the directory no longer matches', async () => {
    const show = feed('https://example.com/show.xml');
    matchAddByRSSFeedsMock.mockResolvedValue({ matches: [matched(show.feedUrl)] });
    convertAddByRSSFeedMock.mockResolvedValue({
      converted: false,
      reason: 'no_match',
      channel: directoryChannel,
    });

    const result = await promoteMatchingAddByRSSFeeds({ feeds: [show], force: true });

    expect(removeAddByRSSFeedMock).not.toHaveBeenCalled();
    expect(emitQueueDataChangedEventMock).not.toHaveBeenCalled();
    expect(result.convertedFeedUrls).toEqual([]);
  });

  it('keeps going when a match or a conversion fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const first = feed('https://example.com/first.xml');
    const second = feed('https://example.com/second.xml');
    matchAddByRSSFeedsMock.mockRejectedValueOnce(new Error('match down'));

    await expect(
      promoteMatchingAddByRSSFeeds({ feeds: [first], force: true })
    ).resolves.toEqual({ convertedFeedUrls: [] });

    matchAddByRSSFeedsMock.mockResolvedValue({
      matches: [matched(first.feedUrl), matched(second.feedUrl)],
    });
    convertAddByRSSFeedMock
      .mockRejectedValueOnce(new Error('convert down'))
      .mockResolvedValueOnce(converted);

    const result = await promoteMatchingAddByRSSFeeds({
      feeds: [first, second],
      force: true,
    });

    expect(removeAddByRSSFeedMock).toHaveBeenCalledTimes(1);
    expect(removeAddByRSSFeedMock).toHaveBeenCalledWith(second.idText);
    expect(result.convertedFeedUrls).toEqual([second.feedUrl]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('splits the match request at the feed cap', async () => {
    const feeds = Array.from({ length: ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS + 1 }, (_, index) =>
      feed(`https://example.com/feed-${index}.xml`)
    );
    matchAddByRSSFeedsMock.mockResolvedValue({ matches: [] });

    await promoteMatchingAddByRSSFeeds({ feeds, force: true });

    expect(matchAddByRSSFeedsMock).toHaveBeenCalledTimes(2);
    const firstChunk = matchAddByRSSFeedsMock.mock.calls[0]?.[0];
    const secondChunk = matchAddByRSSFeedsMock.mock.calls[1]?.[0];
    expect(Array.isArray(firstChunk) ? firstChunk.length : 0).toBe(
      ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS
    );
    expect(Array.isArray(secondChunk) ? secondChunk.length : 0).toBe(1);
  });
});
