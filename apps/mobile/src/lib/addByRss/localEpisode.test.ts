import { describe, expect, it } from 'vitest';

import { formatGuidEnclosureUrl } from '@podverse/helpers';

import { isItemDownloadable } from '../../downloads/downloadEligibility';
import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import { toAddByRssItemPlaybackResourceData } from './domain';
import { addByRssDownloadItemIdText } from './downloadIdText';
import { addByRssDownloadItem } from './downloadItem';
import type { AddByRssCarriedEpisode } from './localEpisode';
import {
  buildAddByRssLocalItemBundle,
  buildAddByRssLocalOnlyMappedFeed,
  findParsedItemForLocalEpisode,
  mergeAddByRssLocalEpisodes,
  planAddByRssDownloadAdoption,
  planKeptLocalEpisodes,
  planLocalEpisodeAbsorb,
} from './localEpisode';
import { addByRssPlaybackMediaId } from './resourceData';

const feed: MobileAddByRSSFeedRecord = {
  enclosureUrl: null,
  feedUrl: 'https://example.com/feed.xml',
  id: 1,
  idText: 'rss-local',
  imageUrl: 'https://example.com/art.png',
  latestItemPubDateMs: null,
  playbackPosition: null,
  resourceType: 'podcasts',
  title: 'Local Show',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const carried = (overrides: Partial<AddByRssCarriedEpisode> = {}): AddByRssCarriedEpisode => ({
  description: 'Hello',
  durationSeconds: 90,
  guid: 'ep-1',
  imageUrl: 'https://example.com/ep.png',
  mediaUrl: 'https://cdn.example/episode.mp3',
  mimeType: 'audio/mpeg',
  pubDate: '2026-04-01T00:00:00.000Z',
  title: 'Episode',
  ...overrides,
});

const bundle = (overrides: Partial<AddByRssCarriedEpisode> = {}) =>
  buildAddByRssLocalItemBundle(carried(overrides));

const storedWith = (items: ReturnType<typeof bundle>[]) => ({
  ...buildAddByRssLocalOnlyMappedFeed(feed),
  items,
});

describe('add by rss local episodes', () => {
  it('names a local bundle by guid, and by enclosure when the guid is missing', () => {
    const withGuid = bundle({ guid: 'ep-1' });
    expect(addByRssDownloadItemIdText(feed.feedUrl, withGuid.item, 0)).toBe(
      `${feed.feedUrl}::ep-1`
    );
    expect(addByRssDownloadItemIdText(feed.feedUrl, withGuid.item, 4)).toBe(
      `${feed.feedUrl}::ep-1`
    );

    const mediaUrl = 'https://cdn.example/no-guid.mp3';
    const withoutGuid = bundle({ guid: null, mediaUrl });
    const enclosureId = `${feed.feedUrl}::${formatGuidEnclosureUrl(mediaUrl)}`;
    expect(addByRssDownloadItemIdText(feed.feedUrl, withoutGuid.item, 0)).toBe(enclosureId);
    expect(addByRssDownloadItemIdText(feed.feedUrl, withoutGuid.item, 9)).toBe(enclosureId);
  });

  it('keeps the playback media id when the local episode moves within the merge', () => {
    const local = bundle({ guid: 'local', mediaUrl: 'https://cdn.example/local.mp3' });
    const other = bundle({ guid: 'other', mediaUrl: 'https://cdn.example/other.mp3' });
    const merged = mergeAddByRssLocalEpisodes({
      feed,
      localItems: [local],
      stored: storedWith([other]),
    });
    const alone = mergeAddByRssLocalEpisodes({ feed, localItems: [local], stored: null });
    const atEnd = merged?.items[1];
    const atStart = alone?.items[0];
    expect(atEnd).toBeDefined();
    expect(atStart).toBeDefined();
    if (merged === null || alone === null || atEnd === undefined || atStart === undefined) {
      return;
    }

    expect(
      addByRssPlaybackMediaId(toAddByRssItemPlaybackResourceData(feed, merged, atEnd, 1))
    ).toBe(addByRssPlaybackMediaId(toAddByRssItemPlaybackResourceData(feed, alone, atStart, 0)));
  });

  it('builds an audio episode and a video episode the download check accepts', () => {
    const audio = addByRssDownloadItem(
      feed.feedUrl,
      bundle({ mediaUrl: 'https://cdn.example/episode.mp3', mimeType: 'audio/mpeg' }),
      0
    );
    const video = addByRssDownloadItem(
      feed.feedUrl,
      bundle({ mediaUrl: 'https://cdn.example/episode.mp4', mimeType: 'video/mp4' }),
      0
    );
    expect(audio).not.toBeNull();
    expect(video).not.toBeNull();
    if (audio === null || video === null) {
      return;
    }

    const audioResult = isItemDownloadable(audio);
    const videoResult = isItemDownloadable(video);
    expect(audioResult.ok).toBe(true);
    expect(videoResult.ok).toBe(true);
    if (!audioResult.ok || !videoResult.ok) {
      return;
    }
    expect(audioResult.source.mediaType).toBe('audio');
    expect(audioResult.source.fileExtension).toBe('mp3');
    expect(videoResult.source.mediaType).toBe('video');
    expect(videoResult.source.fileExtension).toBe('mp4');
  });

  it('merges local episodes after stored items and leaves both inputs alone', () => {
    expect(mergeAddByRssLocalEpisodes({ feed, localItems: [], stored: null })).toBeNull();

    const local = bundle({ guid: 'local', title: 'Local' });
    const stub = mergeAddByRssLocalEpisodes({ feed, localItems: [local], stored: null });
    expect(stub?.channel.channel.title).toBe('Local Show');
    expect(stub?.channel.images[0]?.url).toBe('https://example.com/art.png');
    expect(stub?.items).toEqual([local]);
    expect(stub?.liveItems).toEqual([]);

    const storedItem = bundle({ guid: 'stored', title: 'Stored' });
    const stored = storedWith([storedItem]);
    const storedItems = stored.items;
    const localItems = [local];
    const appended = mergeAddByRssLocalEpisodes({ feed, localItems, stored });
    expect(appended?.items.map((item) => item.item.guid)).toEqual(['stored', 'local']);
    expect(stored.items).toBe(storedItems);
    expect(stored.items).toHaveLength(1);
    expect(localItems).toEqual([local]);

    const sameGuid = bundle({
      guid: 'stored',
      mediaUrl: 'https://cdn.example/other.mp3',
      title: 'Duplicate',
    });
    const skipped = mergeAddByRssLocalEpisodes({
      feed,
      localItems: [sameGuid],
      stored,
    });
    expect(skipped?.items).toHaveLength(1);
    expect(skipped?.items[0]?.item.title).toBe('Stored');
  });

  it('matches a parsed item by guid before enclosure, and by a normalized enclosure url', () => {
    const local = bundle({ guid: 'keep', mediaUrl: 'https://cdn.example/a.mp3' });
    const byEnclosure = bundle({ guid: 'other', mediaUrl: 'https://cdn.example/a.mp3' });
    const byGuid = bundle({ guid: 'keep', mediaUrl: 'https://cdn.example/b.mp3' });
    expect(findParsedItemForLocalEpisode([byEnclosure, byGuid], local)).toBe(1);

    const longUrl = `https://cdn.example/${'a'.repeat(2200)}.mp3`;
    const carriedFile = bundle({ guid: null, mediaUrl: longUrl });
    const storedItem = {
      ...carriedFile,
      item: { ...carriedFile.item, guid: null, guid_enclosure_url: longUrl },
    };
    expect(carriedFile.item.guid_enclosure_url).toBe(formatGuidEnclosureUrl(longUrl));
    expect(carriedFile.item.guid_enclosure_url).not.toBe(longUrl);
    expect(findParsedItemForLocalEpisode([storedItem], carriedFile)).toBe(0);

    const unrelated = bundle({ guid: 'nope', mediaUrl: 'https://cdn.example/z.mp3' });
    expect(findParsedItemForLocalEpisode([unrelated], local)).toBeNull();
  });

  it('adopts a stored episode, a local episode, or an episode that is already downloaded', () => {
    const storedItem = bundle({
      guid: 'ep',
      mediaUrl: 'https://cdn.example/feed.mp3',
      title: 'From feed',
    });
    const stored = storedWith([storedItem]);
    const storedId = addByRssDownloadItemIdText(feed.feedUrl, storedItem.item, 0);
    const feedEpisode = planAddByRssDownloadAdoption({
      episode: carried({
        guid: 'ep',
        mediaUrl: 'https://cdn.example/carried.mp3',
        title: 'Carried',
      }),
      existingDownloadIds: new Set(),
      feedUrl: feed.feedUrl,
      stored,
    });
    expect(feedEpisode.kind).toBe('feed_episode');
    if (feedEpisode.kind === 'feed_episode') {
      expect(feedEpisode.downloadIdText).toBe(storedId);
      expect(feedEpisode.itemIndex).toBe(0);
      expect(feedEpisode.itemBundle.item.title).toBe('From feed');
    }

    const localEpisode = planAddByRssDownloadAdoption({
      episode: carried({ guid: null, mediaUrl: 'https://cdn.example/only.mp3' }),
      existingDownloadIds: new Set(),
      feedUrl: feed.feedUrl,
      stored: null,
    });
    expect(localEpisode.kind).toBe('local_episode');
    if (localEpisode.kind === 'local_episode') {
      expect(localEpisode.downloadIdText).toBe(
        addByRssDownloadItemIdText(feed.feedUrl, localEpisode.itemBundle.item, 0)
      );
    }

    expect(
      planAddByRssDownloadAdoption({
        episode: carried({ guid: 'ep', mediaUrl: 'https://cdn.example/carried.mp3' }),
        existingDownloadIds: new Set([storedId]),
        feedUrl: feed.feedUrl,
        stored,
      })
    ).toEqual({ downloadIdText: storedId, kind: 'already_downloaded' });
  });

  it('absorbs a listed local episode and leaves an unlisted one in place', () => {
    const mediaUrl = 'https://cdn.example/shared.mp3';
    const same = bundle({ guid: 'ep', mediaUrl });
    const sameId = addByRssDownloadItemIdText(feed.feedUrl, same.item, 0);
    expect(
      planLocalEpisodeAbsorb({
        existingDownloadIds: new Set([sameId]),
        feedUrl: feed.feedUrl,
        items: [same],
        local: [{ downloadIdText: sameId, itemBundle: same }],
      })
    ).toEqual([{ downloadIdText: sameId, kind: 'drop_local_row' }]);

    const localItem = bundle({ guid: null, mediaUrl, title: 'Local' });
    const storedItem = bundle({ guid: 'ep', mediaUrl, title: 'Stored' });
    const fromId = addByRssDownloadItemIdText(feed.feedUrl, localItem.item, 0);
    const toId = addByRssDownloadItemIdText(feed.feedUrl, storedItem.item, 0);
    expect(fromId).not.toBe(toId);
    expect(
      planLocalEpisodeAbsorb({
        existingDownloadIds: new Set([fromId]),
        feedUrl: feed.feedUrl,
        items: [storedItem],
        local: [{ downloadIdText: fromId, itemBundle: localItem }],
      })
    ).toEqual([
      {
        fromDownloadIdText: fromId,
        itemBundle: storedItem,
        itemIndex: 0,
        kind: 'move_download',
        toDownloadIdText: toId,
      },
    ]);
    expect(
      planLocalEpisodeAbsorb({
        existingDownloadIds: new Set([fromId, toId]),
        feedUrl: feed.feedUrl,
        items: [storedItem],
        local: [{ downloadIdText: fromId, itemBundle: localItem }],
      })
    ).toEqual([{ downloadIdText: fromId, kind: 'drop_duplicate' }]);

    const gone = bundle({ guid: 'gone', mediaUrl: 'https://cdn.example/gone.mp3' });
    const goneId = addByRssDownloadItemIdText(feed.feedUrl, gone.item, 0);
    expect(
      planLocalEpisodeAbsorb({
        existingDownloadIds: new Set([goneId]),
        feedUrl: feed.feedUrl,
        items: [storedItem],
        local: [{ downloadIdText: goneId, itemBundle: gone }],
      })
    ).toEqual([]);
  });
});

describe('planKeptLocalEpisodes', () => {
  const keptEpisode = bundle({
    guid: 'keep-me',
    mediaUrl: 'https://cdn.example/keep.mp3',
    title: 'Kept',
  });
  const staying = bundle({
    guid: 'stay',
    mediaUrl: 'https://cdn.example/stay.mp3',
    title: 'Stay',
  });
  const keptId = addByRssDownloadItemIdText(feed.feedUrl, keptEpisode.item, 0);
  const stayId = addByRssDownloadItemIdText(feed.feedUrl, staying.item, 1);

  it('keeps a complete download the next bundle drops, with the previous bundle', () => {
    const previous = storedWith([keptEpisode, staying]);
    const result = planKeptLocalEpisodes({
      completeDownloadIds: new Set([keptId, stayId]),
      existingLocalIds: new Set(),
      feedUrl: feed.feedUrl,
      next: storedWith([staying]),
      previous,
    });

    expect(result).toEqual([{ downloadIdText: keptId, itemBundle: keptEpisode }]);
    expect(result[0]?.itemBundle).toBe(previous.items[0]);
  });

  it('does not keep an episode the next bundle still lists', () => {
    const episode = bundle({ guid: 'stay', mediaUrl: 'https://cdn.example/stay.mp3' });
    const downloadIdText = addByRssDownloadItemIdText(feed.feedUrl, episode.item, 0);
    expect(
      planKeptLocalEpisodes({
        completeDownloadIds: new Set([downloadIdText]),
        existingLocalIds: new Set(),
        feedUrl: feed.feedUrl,
        next: storedWith([episode]),
        previous: storedWith([episode]),
      })
    ).toEqual([]);
  });

  it('does not keep an episode with no complete download', () => {
    expect(
      planKeptLocalEpisodes({
        completeDownloadIds: new Set(),
        existingLocalIds: new Set(),
        feedUrl: feed.feedUrl,
        next: storedWith([]),
        previous: storedWith([keptEpisode]),
      })
    ).toEqual([]);
  });

  it('does not keep an episode that is already a local episode', () => {
    expect(
      planKeptLocalEpisodes({
        completeDownloadIds: new Set([keptId]),
        existingLocalIds: new Set([keptId]),
        feedUrl: feed.feedUrl,
        next: storedWith([]),
        previous: storedWith([keptEpisode]),
      })
    ).toEqual([]);
  });

  it('does not keep an episode with neither guid nor guid_enclosure_url', () => {
    const source = bundle({ guid: null, mediaUrl: 'https://cdn.example/index-only.mp3' });
    const indexOnly = {
      ...source,
      item: { ...source.item, guid: null, guid_enclosure_url: null },
    };
    const downloadIdText = addByRssDownloadItemIdText(feed.feedUrl, indexOnly.item, 0);
    expect(downloadIdText).toBe(`${feed.feedUrl}::0`);
    expect(
      planKeptLocalEpisodes({
        completeDownloadIds: new Set([downloadIdText]),
        existingLocalIds: new Set(),
        feedUrl: feed.feedUrl,
        next: storedWith([]),
        previous: storedWith([indexOnly]),
      })
    ).toEqual([]);
  });
});
