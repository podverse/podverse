import type { SortPrefScope } from '@podverse/helpers';
import { pickSortPrefToken } from '@podverse/helpers';
import type { QueryParamsChannelSort, QueryParamsStatsRange } from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_SORT_VALUES,
  QUERY_PARAMS_CHANNEL_SORT_VALUES,
  QUERY_PARAMS_STATS_RANGE_VALUES,
} from '@podverse/helpers-requests';

import { readSortPref, writeSortPref } from './sortPrefs';

/**
 * Remembered list selections for the detail screens, held under the same scope-keyed contract Home
 * uses.
 *
 * Scoped per entity rather than per screen type: one podcast ordered oldest-first says nothing
 * about the next podcast, and a user who set one has not set the other. That is the whole point of
 * the `channel:` and `item:` scopes, and it is why every read here takes an `id_text`.
 *
 * The stored tokens are the ones the queries already take, so a remembered selection reaches a
 * request or a SQLite ordering with no translation table in between.
 *
 * Section chips on channel and item detail are not stored. Those screens always open on their
 * documented default (Episodes, Tracks, Albums, Summary). Home and Browse media-type chips use a
 * different store and stay remembered between visits.
 */

/**
 * Which pane of a podcast can show.
 *
 * Always-on panes come first in the available set; evidence panes (Official clips, Podroll) and
 * Funding follow. Settings (signed-in) is the last section chip — only the optional trailing
 * sort / category filter chip may sit after it. A selected evidence pane is still subject to what
 * this channel actually carries — the caller reconciles that.
 */
export const PODCAST_TABS = [
  'episodes',
  'downloaded',
  'about',
  'clips',
  'soundbites',
  'podroll',
  'funding',
  'settings',
] as const;

export type PodcastTab = (typeof PODCAST_TABS)[number];

export const DEFAULT_PODCAST_TAB: PodcastTab = 'episodes';

/**
 * How a podcast's lists are ordered. The tokens are the ones the channel endpoints take, so a
 * remembered selection reaches a request with no translation table in between.
 */
export const PODCAST_DETAIL_SORT_OPTIONS = QUERY_PARAMS_CHANNEL_SORT_VALUES;

export type PodcastDetailSort = QueryParamsChannelSort;

/** Newest first, which is what a podcast screen is usually opened to check. */
export const DEFAULT_PODCAST_DETAIL_SORT: PodcastDetailSort = 'recent';

/**
 * The popularity window `top` ranks within. Carried for every podcast, not only while `top` is
 * selected, so returning to `top` opens on the window the user last chose rather than the default.
 */
export const PODCAST_DETAIL_RANGE_OPTIONS = QUERY_PARAMS_STATS_RANGE_VALUES;

export type PodcastDetailRange = QueryParamsStatsRange;

export const DEFAULT_PODCAST_DETAIL_RANGE: PodcastDetailRange = 'week';

/**
 * An add-by-RSS feed's episode order.
 *
 * Its own union rather than the directory podcast one: those lists are ordered by the channel
 * endpoints, while this one is sorted on the device from a stored feed, so popularity is not
 * something it can answer and title order is something it can.
 */
export const ADD_BY_RSS_EPISODE_SORT_OPTIONS = ['recent', 'alphabetical'] as const;

export type AddByRssEpisodeSort = (typeof ADD_BY_RSS_EPISODE_SORT_OPTIONS)[number];

export const DEFAULT_ADD_BY_RSS_EPISODE_SORT: AddByRssEpisodeSort = 'recent';

export const ALBUM_TABS = ['tracks', 'about', 'podroll', 'funding', 'settings'] as const;

export type AlbumTab = (typeof ALBUM_TABS)[number];

export const DEFAULT_ALBUM_TAB: AlbumTab = 'tracks';

/** An album's track order: as authored, reversed, or ranked by popularity. */
export const ALBUM_TRACK_SORT_OPTIONS = QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_SORT_VALUES;

export type AlbumTrackSort = (typeof ALBUM_TRACK_SORT_OPTIONS)[number];

/** Album order is authored, so the sequence the artist chose is the one to open on. */
export const DEFAULT_ALBUM_TRACK_SORT: AlbumTrackSort = 'forward';

/** The popularity window `top` ranks album tracks within. */
export const ALBUM_DETAIL_RANGE_OPTIONS = QUERY_PARAMS_STATS_RANGE_VALUES;

export type AlbumDetailRange = QueryParamsStatsRange;

export const DEFAULT_ALBUM_DETAIL_RANGE: AlbumDetailRange = 'week';

export const ARTIST_TABS = ['albums', 'tracks', 'about', 'podroll', 'funding', 'settings'] as const;

export type ArtistTab = (typeof ARTIST_TABS)[number];

/** Albums first — the artist screen opens on its album list, same role Episodes has on a podcast. */
export const DEFAULT_ARTIST_TAB: ArtistTab = 'albums';

/**
 * The clip list on an episode.
 *
 * `top` exists on the endpoint but is left out: it needs a range alongside it, and a second control
 * to answer "top of what" is more than an episode's clip list is worth. Recent and oldest are both
 * answerable without one.
 */
export const EPISODE_CLIP_SORT_OPTIONS = ['recent', 'oldest'] as const;

export type EpisodeClipSort = (typeof EPISODE_CLIP_SORT_OPTIONS)[number];

export const DEFAULT_EPISODE_CLIP_SORT: EpisodeClipSort = 'recent';

/** Every tab an episode can offer. Which are actually shown depends on what the episode carries. */
export const EPISODE_TABS = [
  'summary',
  'clips',
  'chapters',
  'soundbites',
  'transcript',
  'funding',
] as const;

export type EpisodeTab = (typeof EPISODE_TABS)[number];

export const DEFAULT_EPISODE_TAB: EpisodeTab = 'summary';

export const TRACK_TABS = ['summary', 'transcript', 'funding'] as const;

export type TrackTab = (typeof TRACK_TABS)[number];

export const DEFAULT_TRACK_TAB: TrackTab = 'summary';

const channelScope = (channelIdText: string): SortPrefScope => {
  return { idText: channelIdText, kind: 'channel' };
};

const itemScope = (itemIdText: string): SortPrefScope => {
  return { idText: itemIdText, kind: 'item' };
};

export type PodcastDetailPrefs = {
  range: PodcastDetailRange;
  sort: PodcastDetailSort;
};

/**
 * How this podcast's lists should be ordered, and over which popularity window.
 *
 * Read before the first query rather than after it, so the list arrives the way the user left it. A
 * screen that renders the default and then re-sorts has shown the user a list they did not ask for,
 * however briefly. The section chip is not stored — the screen always opens on Episodes (or
 * Downloaded while Offline Mode is on).
 */
export const readPodcastDetailPrefs = async (
  channelIdText: string
): Promise<PodcastDetailPrefs> => {
  const stored = await readSortPref(channelScope(channelIdText));
  return {
    range: pickSortPrefToken(
      stored?.range,
      PODCAST_DETAIL_RANGE_OPTIONS,
      DEFAULT_PODCAST_DETAIL_RANGE
    ),
    sort: pickSortPrefToken(stored?.sort, PODCAST_DETAIL_SORT_OPTIONS, DEFAULT_PODCAST_DETAIL_SORT),
  };
};

export const writePodcastDetailSort = async (
  channelIdText: string,
  sort: PodcastDetailSort
): Promise<void> => {
  await writeSortPref(channelScope(channelIdText), { sort });
};

export const writePodcastDetailRange = async (
  channelIdText: string,
  range: PodcastDetailRange
): Promise<void> => {
  await writeSortPref(channelScope(channelIdText), { range });
};

export type AddByRssDetailPrefs = {
  sort: AddByRssEpisodeSort;
};

/** How this add-by-RSS feed's episode list should open. */
export const readAddByRssDetailPrefs = async (feedIdText: string): Promise<AddByRssDetailPrefs> => {
  const stored = await readSortPref(channelScope(feedIdText));
  return {
    sort: pickSortPrefToken(
      stored?.sort,
      ADD_BY_RSS_EPISODE_SORT_OPTIONS,
      DEFAULT_ADD_BY_RSS_EPISODE_SORT
    ),
  };
};

export const writeAddByRssDetailSort = async (
  feedIdText: string,
  sort: AddByRssEpisodeSort
): Promise<void> => {
  await writeSortPref(channelScope(feedIdText), { sort });
};

export type AlbumDetailPrefs = {
  range: AlbumDetailRange;
  sort: AlbumTrackSort;
};

export const readAlbumDetailPrefs = async (channelIdText: string): Promise<AlbumDetailPrefs> => {
  const stored = await readSortPref(channelScope(channelIdText));
  return {
    range: pickSortPrefToken(stored?.range, ALBUM_DETAIL_RANGE_OPTIONS, DEFAULT_ALBUM_DETAIL_RANGE),
    sort: pickSortPrefToken(stored?.sort, ALBUM_TRACK_SORT_OPTIONS, DEFAULT_ALBUM_TRACK_SORT),
  };
};

export const writeAlbumDetailSort = async (
  channelIdText: string,
  sort: AlbumTrackSort
): Promise<void> => {
  await writeSortPref(channelScope(channelIdText), { sort });
};

export const writeAlbumDetailRange = async (
  channelIdText: string,
  range: AlbumDetailRange
): Promise<void> => {
  await writeSortPref(channelScope(channelIdText), { range });
};

export type EpisodeDetailPrefs = {
  clipSort: EpisodeClipSort;
};

/**
 * How this episode's clips should be ordered.
 *
 * The section chip is not stored — the screen always opens on Summary. Clip order is remembered so
 * returning to Clips keeps the list the way the user left it.
 */
export const readEpisodeDetailPrefs = async (itemIdText: string): Promise<EpisodeDetailPrefs> => {
  const stored = await readSortPref(itemScope(itemIdText));
  return {
    clipSort: pickSortPrefToken(stored?.sort, EPISODE_CLIP_SORT_OPTIONS, DEFAULT_EPISODE_CLIP_SORT),
  };
};

export const writeEpisodeDetailClipSort = async (
  itemIdText: string,
  sort: EpisodeClipSort
): Promise<void> => {
  await writeSortPref(itemScope(itemIdText), { sort });
};
