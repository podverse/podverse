import type { SortPrefScope } from '@podverse/helpers';

import type { HomeMediaType } from './preferredMediaType';
import { readSortPref, subscribeSortPref, writeSortPref } from './sortPrefs';

/**
 * Home's remembered list selections, held under the shared scope-keyed contract.
 *
 * Each media type is its own scope, because ordering podcasts by title and ordering episodes by
 * title are separate opinions and a user who sets one has said nothing about the other.
 */

/**
 * How a Home list is ordered. The tokens are the same ones `subscriptionsRepository` takes, so a
 * stored preference reaches the query without a translation table in between.
 */
export const HOME_SORT_OPTIONS = ['alphabetical', 'recent', 'popularity'] as const;

export type HomeSortOption = (typeof HOME_SORT_OPTIONS)[number];

export const DEFAULT_HOME_SORT: HomeSortOption = 'alphabetical';

/** Listen-count window used when Home asks the directory for a popularity ranking. */
export const HOME_POPULARITY_RANGE = 'week' as const;

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
export const homeSortToApiRange = (sort: HomeSortOption): typeof HOME_POPULARITY_RANGE | null => {
  return sort === 'popularity' ? HOME_POPULARITY_RANGE : null;
};

/** How the subscribed list is drawn: full rows, or a grid of artwork tiles. */
export const HOME_VIEW_MODES = ['list', 'grid'] as const;

export type HomeViewMode = (typeof HOME_VIEW_MODES)[number];

/**
 * List, deliberately — the previous-generation app opened on grid.
 *
 * A grid tile is artwork alone, which only identifies a show to someone who already recognises its
 * cover. Rows name every subscription, so the list is what a new install can actually read.
 */
export const DEFAULT_HOME_VIEW_MODE: HomeViewMode = 'list';

/** Every Home list offers the same three orders. */
export const isHomeSortableMediaType = (_mediaType: HomeMediaType): boolean => {
  return true;
};

/**
 * The media types the grid is offered for.
 *
 * A tile is artwork with nothing else on it, which identifies a show but not an episode — two
 * episodes of the same podcast wear the same cover. So the toggle belongs to the channel list.
 */
export const isHomeViewModeMediaType = (mediaType: HomeMediaType): boolean => {
  return mediaType === 'podcasts';
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
  sort: HomeSortOption;
  viewMode: HomeViewMode;
};

/**
 * What Home should open with for this media type, defaults already applied.
 *
 * Read before the first data query rather than after it, so the list arrives in the order the user
 * left it in instead of appearing in the default order and rearranging itself a moment later.
 */
export const readHomeListPrefs = async (mediaType: HomeMediaType): Promise<HomeListPrefs> => {
  const stored = await readSortPref(buildScope(mediaType));

  const sort =
    stored?.sort !== undefined && isHomeSortOption(stored.sort) ? stored.sort : DEFAULT_HOME_SORT;
  const viewMode =
    stored?.viewMode !== undefined && isHomeViewMode(stored.viewMode)
      ? stored.viewMode
      : DEFAULT_HOME_VIEW_MODE;

  return { sort, viewMode };
};

export const writeHomeSort = async (
  mediaType: HomeMediaType,
  sort: HomeSortOption
): Promise<void> => {
  await writeSortPref(buildScope(mediaType), { sort });
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
 * value and the two cannot disagree about what is selected.
 */
export const subscribeHomeListPrefs = (
  mediaType: HomeMediaType,
  listener: () => void
): (() => void) => {
  return subscribeSortPref(buildScope(mediaType), listener);
};
