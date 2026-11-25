import type { SortPrefScope } from '@podverse/helpers';
import {
  directoryListViewModeScope,
  isChannelListViewModeType,
  pickSortPrefToken,
} from '@podverse/helpers';
import { listScreenSortToMobileHomeSort } from '@podverse/helpers/listScreenDefaults';
import type { QueryParamsStatsRange } from '@podverse/helpers-requests';
import { QUERY_PARAMS_STATS_RANGE_VALUES } from '@podverse/helpers-requests';

import { getMobileConfig } from '../config';
import type { HomeMediaType } from './preferredMediaType';
import { readSortPref, subscribeSortPref, writeSortPref } from './sortPrefs';

/**
 * Home's remembered list selections, held under the shared scope-keyed contract.
 *
 * Each media type is its own scope for sort, range, and list vs grid. Ordering podcasts by title
 * and ordering episodes by title are separate opinions; so is drawing artists as a grid while
 * podcasts stay a list.
 */

/**
 * How a Home list is ordered. The tokens are the same ones `subscriptionsRepository` takes, so a
 * stored preference reaches the query without a translation table in between.
 */
export const HOME_SORT_OPTIONS = ['alphabetical', 'recent', 'popularity'] as const;

export type HomeSortOption = (typeof HOME_SORT_OPTIONS)[number];

export const DEFAULT_HOME_SORT: HomeSortOption = 'alphabetical';

/**
 * Clips order by Recent or Popularity. The clip endpoints have no title order, and a page window
 * sorted by title on the device would reshuffle as more pages arrive.
 */
export const HOME_CLIP_SORT_OPTIONS = [
  'recent',
  'popularity',
] as const satisfies readonly HomeSortOption[];

export const DEFAULT_HOME_CLIP_SORT: HomeSortOption = 'recent';

/** The orders the sort chip offers for this media type. */
export const homeSortOptionsFor = (mediaType: HomeMediaType): readonly HomeSortOption[] => {
  return mediaType === 'clips' ? HOME_CLIP_SORT_OPTIONS : HOME_SORT_OPTIONS;
};

/** The order this media type opens on when nothing usable is stored. */
export const defaultHomeSortFor = (mediaType: HomeMediaType): HomeSortOption => {
  const chipDefault = mediaType === 'clips' ? DEFAULT_HOME_CLIP_SORT : DEFAULT_HOME_SORT;
  const configured = getMobileConfig().listScreens.home.sort;
  if (configured === null) {
    return chipDefault;
  }
  return pickSortPrefToken(
    listScreenSortToMobileHomeSort(configured),
    homeSortOptionsFor(mediaType),
    chipDefault
  );
};

/** List or grid when this Home chip has no saved view. Blank stays on the list. */
export const defaultHomeViewMode = (): HomeViewMode => {
  return getMobileConfig().listScreens.home.view === 'grid' ? 'grid' : DEFAULT_HOME_VIEW_MODE;
};

/**
 * A stored or carried order, or this media type's default when the token is missing or not one
 * the chip offers for it. A Clips A-Z written by an older build reads as Recent.
 */
export const resolveHomeSort = (
  mediaType: HomeMediaType,
  sort: string | undefined
): HomeSortOption => {
  return pickSortPrefToken(sort, homeSortOptionsFor(mediaType), defaultHomeSortFor(mediaType));
};

/**
 * The listen-count window popularity ranks within. Carried for every Home list, not only while
 * popularity is selected, so returning to it opens on the window the user last chose.
 */
export const HOME_RANGE_OPTIONS = QUERY_PARAMS_STATS_RANGE_VALUES;

export type HomeRangeOption = QueryParamsStatsRange;

export const DEFAULT_HOME_RANGE: HomeRangeOption = 'week';

/** API `sort` for the Home clips request. Popularity is the directory's `top` ranking. */
export const homeClipSortToApiSort = (sort: HomeSortOption): 'recent' | 'top' => {
  return sort === 'popularity' ? 'top' : 'recent';
};

/** Popularity is the only Home order that needs a stats window. */
export const homeSortToApiRange = (
  sort: HomeSortOption,
  range: HomeRangeOption = DEFAULT_HOME_RANGE
): HomeRangeOption | null => {
  return sort === 'popularity' ? range : null;
};

/** How an eligible Home list is drawn: full rows, or a grid of artwork tiles. */
export const HOME_VIEW_MODES = ['list', 'grid'] as const;

export type HomeViewMode = (typeof HOME_VIEW_MODES)[number];

/**
 * List is the default. A grid tile is artwork alone, which only identifies a show to someone who
 * already recognises its cover. Rows name every subscription, so the list is what a new install
 * can actually read.
 */
export const DEFAULT_HOME_VIEW_MODE: HomeViewMode = 'list';

/**
 * Every Home list except Livestreams has a sort chip. Clips offers Recent and Popularity; the
 * others add A-Z.
 */
export const isHomeSortableMediaType = (mediaType: HomeMediaType): boolean => {
  return mediaType !== 'livestreams';
};

/**
 * Media types that can draw as an artwork grid.
 *
 * A tile is cover art with nothing else on it, which identifies a channel or album but not an
 * episode, track, or clip — those share covers across many rows.
 */
export const isHomeViewModeMediaType = (mediaType: HomeMediaType): boolean => {
  return isChannelListViewModeType(mediaType);
};

/**
 * Filter is a local title substring over a complete list — honest only for channel chips Home
 * already holds in full. Item and clip feeds are page windows, so Filter stays off for those.
 */
export const isHomeFilterMediaType = (mediaType: HomeMediaType): boolean => {
  return mediaType === 'podcasts' || mediaType === 'artists' || mediaType === 'albums';
};

const buildScope = (mediaType: HomeMediaType): SortPrefScope => {
  return { kind: 'list', name: mediaType };
};

const isHomeViewMode = (value: string): value is HomeViewMode => {
  return HOME_VIEW_MODES.some((mode) => mode === value);
};

export type HomeListPrefs = {
  range: HomeRangeOption;
  sort: HomeSortOption;
  viewMode: HomeViewMode;
};

/** The request that fills the saved Home clips list for a sort and window. */
export type HomeClipsQuery = {
  range: QueryParamsStatsRange | null;
  sort: 'recent' | 'top';
};

export const homeClipsQueryFromPrefs = (
  prefs: Pick<HomeListPrefs, 'range' | 'sort'>
): HomeClipsQuery => {
  return {
    range: homeSortToApiRange(prefs.sort, prefs.range),
    sort: homeClipSortToApiSort(prefs.sort),
  };
};

/**
 * Whether a Home sort or window change has to fetch the saved clips list again. Only the Clips
 * chip, only signed in with Offline Mode off, and only when the request itself changes.
 */
export const homeClipsPrefsChangeRefetches = (input: {
  isAuthenticated: boolean;
  mediaType: HomeMediaType;
  next: Pick<HomeListPrefs, 'range' | 'sort'>;
  offlineModeEnabled: boolean;
  previous: Pick<HomeListPrefs, 'range' | 'sort'>;
}): boolean => {
  if (input.mediaType !== 'clips' || !input.isAuthenticated || input.offlineModeEnabled) {
    return false;
  }
  const previous = homeClipsQueryFromPrefs(input.previous);
  const next = homeClipsQueryFromPrefs(input.next);
  return previous.sort !== next.sort || previous.range !== next.range;
};

/**
 * List vs grid for one Home media type.
 *
 * Read order: this type's stored `viewMode`, then the podcasts `viewMode` when this type has
 * none, then the default list.
 */
export const readHomeViewMode = async (mediaType: HomeMediaType): Promise<HomeViewMode> => {
  if (isChannelListViewModeType(mediaType)) {
    const stored = await readSortPref(directoryListViewModeScope(mediaType));
    if (stored?.viewMode !== undefined && isHomeViewMode(stored.viewMode)) {
      return stored.viewMode;
    }
  }

  const podcasts = await readSortPref(directoryListViewModeScope('podcasts'));
  if (podcasts?.viewMode !== undefined && isHomeViewMode(podcasts.viewMode)) {
    return podcasts.viewMode;
  }

  return defaultHomeViewMode();
};

/**
 * What Home should open with for this media type, defaults already applied.
 *
 * Read before the first data query rather than after it, so the list arrives in the order the user
 * left it in instead of appearing in the default order and rearranging itself a moment later.
 */
export const readHomeListPrefs = async (mediaType: HomeMediaType): Promise<HomeListPrefs> => {
  const stored = await readSortPref(buildScope(mediaType));
  const viewMode = await readHomeViewMode(mediaType);

  const sort = resolveHomeSort(mediaType, stored?.sort);
  const range = pickSortPrefToken(stored?.range, HOME_RANGE_OPTIONS, DEFAULT_HOME_RANGE);

  return { range, sort, viewMode };
};

export const writeHomeSort = async (
  mediaType: HomeMediaType,
  sort: HomeSortOption
): Promise<void> => {
  if (!homeSortOptionsFor(mediaType).includes(sort)) {
    return;
  }

  await writeSortPref(buildScope(mediaType), { sort });
};

export const writeHomeRange = async (
  mediaType: HomeMediaType,
  range: HomeRangeOption
): Promise<void> => {
  await writeSortPref(buildScope(mediaType), { range, sort: 'popularity' });
};

export const writeHomeViewMode = async (
  mediaType: HomeMediaType,
  viewMode: HomeViewMode
): Promise<void> => {
  if (!isChannelListViewModeType(mediaType)) {
    return;
  }

  await writeSortPref(directoryListViewModeScope(mediaType), { viewMode });
};

/**
 * Watch this media type's preferences.
 *
 * The sort screen writes the preference and Home reads it back, so neither has to hand the other a
 * value and the two cannot disagree about what is selected.
 */
export const subscribeHomeListPrefs = (
  mediaType: HomeMediaType,
  listener: () => void
): (() => void) => {
  return subscribeSortPref(buildScope(mediaType), listener);
};
