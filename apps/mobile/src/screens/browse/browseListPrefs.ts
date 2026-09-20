import type { SortPrefScope } from '@podverse/helpers';

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
  return mediaType === 'podcasts' || mediaType === 'artists' || mediaType === 'albums';
};

const isHomeViewMode = (value: string): value is HomeViewMode => {
  return HOME_VIEW_MODES.some((mode) => mode === value);
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
  const viewMode =
    stored?.viewMode !== undefined && isHomeViewMode(stored.viewMode)
      ? stored.viewMode
      : DEFAULT_HOME_VIEW_MODE;

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

export const writeBrowseViewMode = async (viewMode: HomeViewMode): Promise<void> => {
  await writeSortPref(BROWSE_ROOT_SCOPE, { viewMode });
};

export const subscribeBrowseListPrefs = (listener: () => void): (() => void) => {
  return subscribeSortPref(BROWSE_ROOT_SCOPE, listener);
};
