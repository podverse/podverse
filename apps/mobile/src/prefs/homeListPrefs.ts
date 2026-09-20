import type { SortPrefScope } from '@podverse/helpers';
import { pickSortPrefToken } from '@podverse/helpers';
import type { QueryParamsStatsRange } from '@podverse/helpers-requests';
import { QUERY_PARAMS_STATS_RANGE_VALUES } from '@podverse/helpers-requests';

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
 * The listen-count window popularity ranks within. Carried for every Home list, not only while
 * popularity is selected, so returning to it opens on the window the user last chose.
 */
export const HOME_RANGE_OPTIONS = QUERY_PARAMS_STATS_RANGE_VALUES;

export type HomeRangeOption = QueryParamsStatsRange;

export const DEFAULT_HOME_RANGE: HomeRangeOption = 'week';

/** API `sort` for a Home preference. Popularity is the directory's `top` ranking. */
export const homeSortToApiSort = (sort: HomeSortOption): 'a_z' | 'recent' | 'top' => {
  if (sort === 'alphabetical') {
    return 'a_z';
  }
  if (sort === 'popularity') {
    return 'top';
  }
  return 'recent';
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
 * List, deliberately — the previous-generation app opened on grid.
 *
 * A grid tile is artwork alone, which only identifies a show to someone who already recognises its
 * cover. Rows name every subscription, so the list is what a new install can actually read.
 */
export const DEFAULT_HOME_VIEW_MODE: HomeViewMode = 'list';

/** Screen-wide list/grid value used when a media type has no viewMode of its own. */
const HOME_VIEW_MODE_SCOPE: SortPrefScope = { kind: 'list', name: 'home-layout' };

/** Every Home list offers the same three orders. */
export const isHomeSortableMediaType = (_mediaType: HomeMediaType): boolean => {
  return true;
};

/**
 * Media types that can draw as an artwork grid.
 *
 * A tile is cover art with nothing else on it, which identifies a channel or album but not an
 * episode, track, or clip — those share covers across many rows.
 */
export const isHomeViewModeMediaType = (mediaType: HomeMediaType): boolean => {
  return mediaType === 'podcasts' || mediaType === 'artists' || mediaType === 'albums';
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

const isHomeSortOption = (value: string): value is HomeSortOption => {
  return HOME_SORT_OPTIONS.some((option) => option === value);
};

const isHomeViewMode = (value: string): value is HomeViewMode => {
  return HOME_VIEW_MODES.some((mode) => mode === value);
};

export type HomeListPrefs = {
  range: HomeRangeOption;
  sort: HomeSortOption;
  viewMode: HomeViewMode;
};

/**
 * List vs grid for one Home media type.
 *
 * Read order: this type's stored `viewMode`, then `home-layout`, then the podcasts-scoped
 * `viewMode`, then the default list.
 */
export const readHomeViewMode = async (mediaType: HomeMediaType): Promise<HomeViewMode> => {
  const stored = await readSortPref(buildScope(mediaType));
  if (stored?.viewMode !== undefined && isHomeViewMode(stored.viewMode)) {
    return stored.viewMode;
  }

  const homeLayout = await readSortPref(HOME_VIEW_MODE_SCOPE);
  if (homeLayout?.viewMode !== undefined && isHomeViewMode(homeLayout.viewMode)) {
    return homeLayout.viewMode;
  }

  const podcasts = await readSortPref(buildScope('podcasts'));
  if (podcasts?.viewMode !== undefined && isHomeViewMode(podcasts.viewMode)) {
    return podcasts.viewMode;
  }

  return DEFAULT_HOME_VIEW_MODE;
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

  const sort =
    stored?.sort !== undefined && isHomeSortOption(stored.sort) ? stored.sort : DEFAULT_HOME_SORT;
  const range = pickSortPrefToken(stored?.range, HOME_RANGE_OPTIONS, DEFAULT_HOME_RANGE);

  return { range, sort, viewMode };
};

export const writeHomeSort = async (
  mediaType: HomeMediaType,
  sort: HomeSortOption
): Promise<void> => {
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
  await writeSortPref(buildScope(mediaType), { viewMode });
};

/**
 * Watch this media type's preferences.
 *
 * The sort screen writes the preference and Home reads it back, so neither has to hand the other a
 * value and the two cannot disagree about what is selected. `home-layout` is a read-only fallback
 * for types without their own viewMode.
 */
export const subscribeHomeListPrefs = (
  mediaType: HomeMediaType,
  listener: () => void
): (() => void) => {
  return subscribeSortPref(buildScope(mediaType), listener);
};
