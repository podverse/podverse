import type { SortPrefScope } from '@podverse/helpers';
import { pickSortPrefToken } from '@podverse/helpers';

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
 */

/** How a podcast's stored episodes are ordered. Matches what the stored-item query accepts. */
export const PODCAST_EPISODE_SORT_OPTIONS = ['recent', 'alphabetical'] as const;

export type PodcastEpisodeSort = (typeof PODCAST_EPISODE_SORT_OPTIONS)[number];

/**
 * Newest first, which is what a podcast screen is usually opened to check. Alphabetical is the
 * useful order for a back catalogue somebody is working through, so it is offered rather than
 * assumed.
 */
export const DEFAULT_PODCAST_EPISODE_SORT: PodcastEpisodeSort = 'recent';

/** An album's track order: as the artist sequenced it, or reversed. */
export const ALBUM_TRACK_SORT_OPTIONS = ['forward', 'backward'] as const;

export type AlbumTrackSort = (typeof ALBUM_TRACK_SORT_OPTIONS)[number];

/** Album order is authored, so the sequence the artist chose is the one to open on. */
export const DEFAULT_ALBUM_TRACK_SORT: AlbumTrackSort = 'forward';

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
] as const;

export type EpisodeTab = (typeof EPISODE_TABS)[number];

export const DEFAULT_EPISODE_TAB: EpisodeTab = 'summary';

const channelScope = (channelIdText: string): SortPrefScope => {
  return { idText: channelIdText, kind: 'channel' };
};

const itemScope = (itemIdText: string): SortPrefScope => {
  return { idText: itemIdText, kind: 'item' };
};

export type PodcastDetailPrefs = {
  sort: PodcastEpisodeSort;
};

/**
 * How this podcast's episode list should open.
 *
 * Read before the first query rather than after it, so the list arrives in the order the user left
 * it in. A screen that renders the default and then re-sorts has shown the user a list they did not
 * ask for, however briefly.
 */
export const readPodcastDetailPrefs = async (
  channelIdText: string
): Promise<PodcastDetailPrefs> => {
  const stored = await readSortPref(channelScope(channelIdText));
  return {
    sort: pickSortPrefToken(
      stored?.sort,
      PODCAST_EPISODE_SORT_OPTIONS,
      DEFAULT_PODCAST_EPISODE_SORT
    ),
  };
};

export const writePodcastDetailSort = async (
  channelIdText: string,
  sort: PodcastEpisodeSort
): Promise<void> => {
  await writeSortPref(channelScope(channelIdText), { sort });
};

export type AlbumDetailPrefs = {
  sort: AlbumTrackSort;
};

export const readAlbumDetailPrefs = async (channelIdText: string): Promise<AlbumDetailPrefs> => {
  const stored = await readSortPref(channelScope(channelIdText));
  return {
    sort: pickSortPrefToken(stored?.sort, ALBUM_TRACK_SORT_OPTIONS, DEFAULT_ALBUM_TRACK_SORT),
  };
};

export const writeAlbumDetailSort = async (
  channelIdText: string,
  sort: AlbumTrackSort
): Promise<void> => {
  await writeSortPref(channelScope(channelIdText), { sort });
};

export type EpisodeDetailPrefs = {
  clipSort: EpisodeClipSort;
  tab: EpisodeTab;
};

/**
 * Which tab this episode should open on, and how its clips should be ordered.
 *
 * The tab is remembered because it decides which request the screen makes. Restoring it after the
 * screen had already loaded Summary would mean fetching twice and showing the wrong pane in
 * between.
 *
 * A remembered tab is still subject to what the episode actually has: an episode with no transcript
 * cannot open on one. The caller reconciles that, because only it knows what this episode carries.
 */
export const readEpisodeDetailPrefs = async (itemIdText: string): Promise<EpisodeDetailPrefs> => {
  const stored = await readSortPref(itemScope(itemIdText));
  return {
    clipSort: pickSortPrefToken(stored?.sort, EPISODE_CLIP_SORT_OPTIONS, DEFAULT_EPISODE_CLIP_SORT),
    tab: pickSortPrefToken(stored?.tab, EPISODE_TABS, DEFAULT_EPISODE_TAB),
  };
};

export const writeEpisodeDetailTab = async (
  itemIdText: string,
  tab: EpisodeTab
): Promise<void> => {
  await writeSortPref(itemScope(itemIdText), { tab });
};

export const writeEpisodeDetailClipSort = async (
  itemIdText: string,
  sort: EpisodeClipSort
): Promise<void> => {
  await writeSortPref(itemScope(itemIdText), { sort });
};
