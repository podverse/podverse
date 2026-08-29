import type { SortPrefScope } from '@podverse/helpers';

import type { HomeMediaType } from './preferredMediaType';
import { getPref } from './prefsStore';
import { readSortPref, subscribeSortPref, writeSortPref } from './sortPrefs';
import type { SubscriptionListFilter } from './subscriptionFilter';
import { DEFAULT_SUBSCRIPTION_FILTER } from './subscriptionFilter';

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
export const HOME_SORT_OPTIONS = ['alphabetical', 'recent'] as const;

export type HomeSortOption = (typeof HOME_SORT_OPTIONS)[number];

export const DEFAULT_HOME_SORT: HomeSortOption = 'alphabetical';

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

/** The media types with a working sort control. */
export const HOME_SORTABLE_MEDIA_TYPES: readonly HomeMediaType[] = ['podcasts', 'episodes'];

/** Whether this media type offers sorting, so callers can hide the control rather than lie. */
export const isHomeSortableMediaType = (mediaType: HomeMediaType): boolean => {
  return HOME_SORTABLE_MEDIA_TYPES.includes(mediaType);
};

/** The subscription scope chip applies to the channel list only. */
const SUBSCRIPTION_FILTER_MEDIA_TYPE: HomeMediaType = 'podcasts';

export const isHomeSubscriptionFilterMediaType = (mediaType: HomeMediaType): boolean => {
  return mediaType === SUBSCRIPTION_FILTER_MEDIA_TYPE;
};

/**
 * The media types the grid is offered for.
 *
 * A tile is artwork with nothing else on it, which identifies a show but not an episode — two
 * episodes of the same podcast wear the same cover. So the toggle belongs to the channel list.
 */
export const isHomeViewModeMediaType = (mediaType: HomeMediaType): boolean => {
  return mediaType === SUBSCRIPTION_FILTER_MEDIA_TYPE;
};

const buildScope = (mediaType: HomeMediaType): SortPrefScope => {
  return { kind: 'list', name: mediaType };
};

const isHomeSortOption = (value: string): value is HomeSortOption => {
  return HOME_SORT_OPTIONS.some((option) => option === value);
};

const isSubscriptionListFilter = (value: string): value is SubscriptionListFilter => {
  return value === 'all' || value === 'addByRss';
};

const isHomeViewMode = (value: string): value is HomeViewMode => {
  return HOME_VIEW_MODES.some((mode) => mode === value);
};

export type HomeListPrefs = {
  filter: SubscriptionListFilter;
  sort: HomeSortOption;
  viewMode: HomeViewMode;
};

const readSubscriptionFilter = async (): Promise<SubscriptionListFilter> => {
  const stored = await readSortPref(buildScope(SUBSCRIPTION_FILTER_MEDIA_TYPE));
  if (stored?.filter !== undefined && isSubscriptionListFilter(stored.filter)) {
    return stored.filter;
  }

  // A device that set the scope chip before Home had a sort keeps that choice: the value is read
  // from where it used to live and written into the scoped entry the first time this runs, so the
  // chip does not silently reset to All.
  const legacyFilter = await getPref('home.subscriptionFilter');
  if (legacyFilter !== null) {
    await writeSortPref(buildScope(SUBSCRIPTION_FILTER_MEDIA_TYPE), { filter: legacyFilter });
    return legacyFilter;
  }

  return DEFAULT_SUBSCRIPTION_FILTER;
};

/**
 * What Home should open with for this media type, defaults already applied.
 *
 * Read before the first data query rather than after it, so the list arrives in the order the user
 * left it in instead of appearing in the default order and rearranging itself a moment later.
 */
export const readHomeListPrefs = async (mediaType: HomeMediaType): Promise<HomeListPrefs> => {
  const [stored, filter] = await Promise.all([
    readSortPref(buildScope(mediaType)),
    readSubscriptionFilter(),
  ]);

  const sort =
    stored?.sort !== undefined && isHomeSortOption(stored.sort) ? stored.sort : DEFAULT_HOME_SORT;
  const viewMode =
    stored?.viewMode !== undefined && isHomeViewMode(stored.viewMode)
      ? stored.viewMode
      : DEFAULT_HOME_VIEW_MODE;

  return { filter, sort, viewMode };
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

export const writeHomeSubscriptionFilter = async (
  filter: SubscriptionListFilter
): Promise<void> => {
  await writeSortPref(buildScope(SUBSCRIPTION_FILTER_MEDIA_TYPE), { filter });
};

/**
 * Watch this media type's preferences.
 *
 * The filter/sort screen writes the preference and Home reads it back, so neither has to hand the
 * other a value and the two cannot disagree about what is selected.
 */
export const subscribeHomeListPrefs = (
  mediaType: HomeMediaType,
  listener: () => void
): (() => void) => {
  const unsubscribeMediaType = subscribeSortPref(buildScope(mediaType), listener);
  if (mediaType === SUBSCRIPTION_FILTER_MEDIA_TYPE) {
    return unsubscribeMediaType;
  }

  const unsubscribeFilter = subscribeSortPref(buildScope(SUBSCRIPTION_FILTER_MEDIA_TYPE), listener);
  return () => {
    unsubscribeMediaType();
    unsubscribeFilter();
  };
};
