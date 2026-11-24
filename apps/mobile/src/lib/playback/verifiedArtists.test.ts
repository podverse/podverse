import { afterEach, describe, expect, it } from 'vitest';

import type { DTOChannel, DTOItem, DTOVerifiedPublisher } from '@podverse/helpers/dto';
import { MediumEnum } from '@podverse/helpers/medium';
import type { PlaybackTarget } from '@podverse/playback-core';

import type { AddByRssArtistIndexFeed } from '../addByRss/addByRssArtistIndex';
import {
  hydrateAddByRssArtistIndex,
  resetAddByRssArtistIndexForTests,
} from '../addByRss/addByRssArtistIndex';
import { directoryLineArtist } from './lineArtist';
import {
  artistAlbumLine,
  itemArtistNames,
  nowPlayingArtistFields,
  playbackTargetArtists,
  resolveVerifiedArtists,
  verifiedArtistNames,
} from './verifiedArtists';

const publisher = (
  id_text: string,
  title: string | null,
  medium_id: MediumEnum
): DTOVerifiedPublisher => ({
  id_text,
  medium_id,
  title,
});

const musicArtist = publisher('artist-a', 'A', MediumEnum.PublisherMusic);
const secondArtist = publisher('artist-b', 'B', MediumEnum.PublisherMusic);
const podcastNetwork = publisher('net', 'Network', MediumEnum.PublisherPodcast);

const albumChannel = (verified_publishers?: DTOVerifiedPublisher[]): DTOChannel => ({
  feed_id: 0,
  has_value_time_splits: false,
  id: 1,
  id_text: 'album-1',
  medium_id: MediumEnum.Music,
  podcast_guid: null,
  slug: null,
  sortable_title: null,
  title: 'Album',
  verified_publishers,
});

const trackItem = (verified_publishers?: DTOVerifiedPublisher[]): DTOItem => ({
  channel_id: 1,
  id: 2,
  id_text: 'track-1',
  item_about: { id: 1, item_id: 2 },
  item_chat: { id: 1, item_id: 2, server: '' },
  item_content_links: [],
  item_enclosures: [],
  item_flag_status_id: 0,
  item_fundings: [],
  item_images: [],
  item_license: { id: 1, identifier: '', item_id: 2, url: null },
  item_location: { id: 1, item_id: 2, name: null },
  item_persons: [],
  item_season: { channel_season_id: 0, id: 1, item_id: 2, title: null },
  item_social_interacts: [],
  item_soundbites: [],
  item_transcripts: [],
  item_txts: [],
  item_values: [],
  verified_publishers,
});

describe('resolveVerifiedArtists', () => {
  it('keeps an artist-kind publisher and drops a podcast publisher from the same list', () => {
    expect(
      resolveVerifiedArtists({
        channel: { verified_publishers: [podcastNetwork, musicArtist] },
      })
    ).toEqual([musicArtist]);
  });

  it('lists channel-wide artists first, then item-only artists', () => {
    expect(
      resolveVerifiedArtists({
        channel: { verified_publishers: [musicArtist] },
        item: { verified_publishers: [secondArtist] },
      })
    ).toEqual([musicArtist, secondArtist]);
  });

  it('returns an empty list when both sides omit the field', () => {
    expect(resolveVerifiedArtists({})).toEqual([]);
    expect(resolveVerifiedArtists({ channel: {}, item: {} })).toEqual([]);
  });
});

describe('verifiedArtistNames', () => {
  it('returns one artist title', () => {
    expect(verifiedArtistNames({ channel: { verified_publishers: [musicArtist] } })).toBe('A');
  });

  it('joins two artist titles', () => {
    expect(
      verifiedArtistNames({
        channel: { verified_publishers: [musicArtist, secondArtist] },
      })
    ).toBe('A, B');
  });

  it('returns null when there is no artist', () => {
    expect(verifiedArtistNames({})).toBe(null);
    expect(verifiedArtistNames({ channel: { verified_publishers: [podcastNetwork] } })).toBe(null);
  });
});

describe('itemArtistNames', () => {
  it('reads an artist from the embedded channel', () => {
    expect(
      itemArtistNames({
        ...trackItem(),
        channel: albumChannel([musicArtist]),
      })
    ).toBe('A');
  });

  it('reads an artist from channel-wide publishers when the item has no channel', () => {
    expect(
      itemArtistNames({
        ...trackItem(),
        channel_wide_verified_publishers: [musicArtist],
      })
    ).toBe('A');
  });

  it('returns null when the item has neither', () => {
    expect(itemArtistNames(trackItem())).toBe(null);
  });
});

const RSS_ALBUM_URL = 'https://example.com/album.xml';
const RSS_ARTIST_URL = 'https://example.com/artist.xml';

const rssFeed = (
  overrides: Partial<AddByRssArtistIndexFeed> &
    Pick<AddByRssArtistIndexFeed, 'feedUrl' | 'feedIdText' | 'title' | 'resourceType'>
): AddByRssArtistIndexFeed => ({
  followed: true,
  podcastGuid: null,
  publisherGuids: [],
  directoryMatches: [],
  ...overrides,
});

const rssArtist = rssFeed({
  feedUrl: RSS_ARTIST_URL,
  feedIdText: 'rss-artist-id',
  title: 'RSS Artist',
  resourceType: 'artists',
  podcastGuid: 'rss-artist-guid',
});

const rssAlbum = (overrides: Partial<AddByRssArtistIndexFeed> = {}): AddByRssArtistIndexFeed =>
  rssFeed({
    feedUrl: RSS_ALBUM_URL,
    feedIdText: 'rss-album-id',
    title: 'RSS Album',
    resourceType: 'albums',
    podcastGuid: 'rss-album-guid',
    ...overrides,
  });

const addByRssTarget: PlaybackTarget = {
  kind: 'add-by-rss',
  resourceData: { feed_url: RSS_ALBUM_URL, title: 'Track' },
};

const directoryTarget = (verified_publishers?: DTOVerifiedPublisher[]): PlaybackTarget => ({
  channel: albumChannel(verified_publishers),
  intent: 'explicit_play',
  item: trackItem(),
  kind: 'item-music',
});

const rssArtistLine = {
  kind: 'add-by-rss',
  feedIdText: 'rss-artist-id',
  feedUrl: RSS_ARTIST_URL,
  title: 'RSS Artist',
};

describe('playbackTargetArtists', () => {
  afterEach(() => {
    resetAddByRssArtistIndexForTests();
  });

  it('returns an empty list for a null target', () => {
    expect(playbackTargetArtists(null)).toEqual([]);
  });

  it('returns the channel artist for an item-music target', () => {
    expect(playbackTargetArtists(directoryTarget([musicArtist]))).toEqual([
      directoryLineArtist(musicArtist),
    ]);
  });

  it('returns an empty list for an add-by-rss target before the index is hydrated', () => {
    expect(playbackTargetArtists(addByRssTarget)).toEqual([]);
  });

  it('reads the channel when a livestream has no item', () => {
    const target: PlaybackTarget = {
      channel: albumChannel([musicArtist]),
      item: null,
      kind: 'livestream',
    };
    expect(playbackTargetArtists(target)).toEqual([directoryLineArtist(musicArtist)]);
  });

  it('returns the Add by RSS artist that lists the playing Add by RSS album', () => {
    hydrateAddByRssArtistIndex({
      feeds: [rssArtist, rssAlbum()],
      listings: [
        {
          publisherFeedUrl: RSS_ARTIST_URL,
          feedGuid: 'rss-album-guid',
          feedUrl: RSS_ALBUM_URL,
          kind: 'add_by_rss',
          channelIdText: null,
          mediumId: null,
          listedAtChannelLevel: true,
        },
      ],
    });
    const artists = playbackTargetArtists(addByRssTarget);
    expect(artists).toEqual([rssArtistLine]);
    expect(artistAlbumLine(artists, 'RSS Album')).toBe('RSS Artist · RSS Album');
  });

  it('falls back to the directory artist an Add by RSS album pointer matched', () => {
    hydrateAddByRssArtistIndex({
      feeds: [
        rssAlbum({
          directoryMatches: [
            {
              feedGuid: 'dir-artist-guid',
              channelIdText: 'dir-artist',
              channelTitle: 'Directory Artist',
              mediumId: MediumEnum.PublisherMusic,
            },
          ],
        }),
      ],
      listings: [],
    });
    expect(playbackTargetArtists(addByRssTarget)).toEqual([
      directoryLineArtist({
        id_text: 'dir-artist',
        medium_id: MediumEnum.PublisherMusic,
        title: 'Directory Artist',
      }),
    ]);
  });

  it('returns no artist for an Add by RSS album with neither, keeping the album as the artist field', () => {
    hydrateAddByRssArtistIndex({ feeds: [rssAlbum()], listings: [] });
    const artists = playbackTargetArtists(addByRssTarget);
    expect(artists).toEqual([]);
    expect(nowPlayingArtistFields(artists, 'RSS Album')).toEqual({
      albumTitle: null,
      artist: 'RSS Album',
    });
  });

  it('keeps a directory album on its verified artist when an Add by RSS artist also lists it', () => {
    hydrateAddByRssArtistIndex({
      feeds: [rssArtist],
      listings: [
        {
          publisherFeedUrl: RSS_ARTIST_URL,
          feedGuid: 'directory-album-guid',
          feedUrl: null,
          kind: 'directory',
          channelIdText: 'album-1',
          mediumId: MediumEnum.Music,
          listedAtChannelLevel: true,
        },
      ],
    });
    expect(playbackTargetArtists(directoryTarget([musicArtist]))).toEqual([
      directoryLineArtist(musicArtist),
    ]);
  });

  it('returns the Add by RSS artist that lists a directory album with no verified artist', () => {
    hydrateAddByRssArtistIndex({
      feeds: [rssArtist],
      listings: [
        {
          publisherFeedUrl: RSS_ARTIST_URL,
          feedGuid: 'directory-album-guid',
          feedUrl: null,
          kind: 'directory',
          channelIdText: 'album-1',
          mediumId: MediumEnum.Music,
          listedAtChannelLevel: true,
        },
      ],
    });
    expect(playbackTargetArtists(directoryTarget())).toEqual([rssArtistLine]);
  });
});

describe('artistAlbumLine', () => {
  const artists = [musicArtist, secondArtist].map(directoryLineArtist);

  it('joins artist names and the album title with a middle dot', () => {
    expect(artistAlbumLine(artists, 'Album')).toBe('A, B · Album');
  });

  it('returns only the names when the album title is empty', () => {
    expect(artistAlbumLine(artists, null)).toBe('A, B');
    expect(artistAlbumLine(artists, '   ')).toBe('A, B');
  });

  it('returns only the album title when there are no artists', () => {
    expect(artistAlbumLine([], 'Album')).toBe('Album');
  });

  it('returns null when both are empty', () => {
    expect(artistAlbumLine([], null)).toBe(null);
    expect(artistAlbumLine([], '  ')).toBe(null);
  });
});

describe('nowPlayingArtistFields', () => {
  const artists = [musicArtist, secondArtist].map(directoryLineArtist);

  it('puts artist names in the artist field and the channel title in the album field', () => {
    expect(nowPlayingArtistFields(artists, 'Album')).toEqual({
      albumTitle: 'Album',
      artist: 'A, B',
    });
    expect(nowPlayingArtistFields(artists, null)).toEqual({
      albumTitle: null,
      artist: 'A, B',
    });
  });

  it('keeps the channel title in the artist field when there is no artist', () => {
    expect(nowPlayingArtistFields([], 'Show')).toEqual({
      albumTitle: null,
      artist: 'Show',
    });
  });

  it('returns null for both fields when there is nothing to show', () => {
    expect(nowPlayingArtistFields([], null)).toEqual({
      albumTitle: null,
      artist: null,
    });
    expect(nowPlayingArtistFields([], '   ')).toEqual({
      albumTitle: null,
      artist: null,
    });
  });
});
