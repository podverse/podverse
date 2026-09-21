import type { SortPrefScope, SortPrefValue } from '@podverse/helpers';
import {
  browseListViewModeScope,
  CHANNEL_LIST_VIEW_MODE_TYPES,
  isChannelListViewModeType,
} from '@podverse/helpers';

import type { HomeViewMode } from '../../prefs/homeListPrefs';
import { DEFAULT_HOME_VIEW_MODE, HOME_VIEW_MODES } from '../../prefs/homeListPrefs';
import { readSortPref, subscribeSortPref, writeSortPref } from '../../prefs/sortPrefs';
import type { BrowseMediaType, BrowseRangeOption } from './browseTypes';
import {
  DEFAULT_BROWSE_MEDIA_TYPE,
  DEFAULT_BROWSE_RANGE,
  isBrowseMediaType,
  isBrowseRangeOption,
} from './browseTypes';

const BROWSE_ROOT_SCOPE: SortPrefScope = { kind: 'list', name: 'browse' };

export type BrowseListPrefs = {
  category: string | null;
  mediaType: BrowseMediaType;
  range: BrowseRangeOption;
  viewMode: HomeViewMode;
};

/**
 * Media types that can draw as an artwork grid on Browse.
 *
 * Episodes, tracks, clips, playlists, and users are list-only — a tile cannot name the row.
 */
export const isBrowseViewModeMediaType = (mediaType: BrowseMediaType): boolean => {
  return isChannelListViewModeType(mediaType);
};

const isHomeViewMode = (value: string): value is HomeViewMode => {
  return HOME_VIEW_MODES.some((mode) => mode === value);
};

const readBrowseViewMode = async (
  mediaType: BrowseMediaType,
  root: SortPrefValue | null
): Promise<HomeViewMode> => {
  if (isChannelListViewModeType(mediaType)) {
    const stored = await readSortPref(browseListViewModeScope(mediaType));
    if (stored?.viewMode !== undefined && isHomeViewMode(stored.viewMode)) {
      return stored.viewMode;
    }
  }

  if (root?.viewMode !== undefined && isHomeViewMode(root.viewMode)) {
    return root.viewMode;
  }

  return DEFAULT_HOME_VIEW_MODE;
};

export const readBrowseListPrefs = async (): Promise<BrowseListPrefs> => {
  const stored = await readSortPref(BROWSE_ROOT_SCOPE);
  const mediaType =
    stored?.mediaType !== undefined && isBrowseMediaType(stored.mediaType)
      ? stored.mediaType
      : DEFAULT_BROWSE_MEDIA_TYPE;
  const range =
    stored?.range !== undefined && isBrowseRangeOption(stored.range)
      ? stored.range
      : DEFAULT_BROWSE_RANGE;
  const category = stored?.category !== undefined ? stored.category : null;
  const viewMode = await readBrowseViewMode(mediaType, stored);

  return {
    category,
    mediaType,
    range,
    viewMode,
  };
};

export const writeBrowseMediaType = async (mediaType: BrowseMediaType): Promise<void> => {
  await writeSortPref(BROWSE_ROOT_SCOPE, { mediaType });
};

export const writeBrowseRange = async (range: BrowseRangeOption): Promise<void> => {
  await writeSortPref(BROWSE_ROOT_SCOPE, { range });
};

export const writeBrowseCategory = async (category: string | null): Promise<void> => {
  await writeSortPref(BROWSE_ROOT_SCOPE, {
    category: category === null ? undefined : category,
  });
};

export const writeBrowseViewMode = async (
  mediaType: BrowseMediaType,
  viewMode: HomeViewMode
): Promise<void> => {
  if (!isChannelListViewModeType(mediaType)) {
    return;
  }

  await writeSortPref(browseListViewModeScope(mediaType), { viewMode });
};

export const subscribeBrowseListPrefs = (listener: () => void): (() => void) => {
  const unsubscribeRoot = subscribeSortPref(BROWSE_ROOT_SCOPE, listener);
  const unsubscribeViewModes = CHANNEL_LIST_VIEW_MODE_TYPES.map((mediaType) =>
    subscribeSortPref(browseListViewModeScope(mediaType), listener)
  );

  return () => {
    unsubscribeRoot();
    for (const unsubscribe of unsubscribeViewModes) {
      unsubscribe();
    }
  };
};
