import type { SortPrefScope } from '@podverse/helpers';
import { isChannelListViewModeType } from '@podverse/helpers';

import { readSortPref, subscribeSortPref, writeSortPref } from './sortPrefs';

/**
 * Add by RSS library list selections. Separate from Home so ordering podcasts on one screen does
 * not change the other.
 */

export const ADD_BY_RSS_LIBRARY_MEDIA_TYPES = [
  'podcasts',
  'episodes',
  'artists',
  'albums',
  'tracks',
  'livestreams',
] as const;

export type AddByRssLibraryMediaType = (typeof ADD_BY_RSS_LIBRARY_MEDIA_TYPES)[number];

export const addByRssLibraryEmptyMessageKey = (mediaType: AddByRssLibraryMediaType): string => {
  switch (mediaType) {
    case 'podcasts':
      return 'media.podcast.no_podcasts_found';
    case 'episodes':
      return 'media.podcast.no_episodes_found';
    case 'artists':
      return 'media.music.no_artists_found';
    case 'albums':
      return 'media.music.no_albums_found';
    case 'tracks':
      return 'media.music.no_tracks_found';
    case 'livestreams':
      return 'media.livestream.no_livestreams_found';
  }
};

export const DEFAULT_ADD_BY_RSS_LIBRARY_MEDIA_TYPE: AddByRssLibraryMediaType = 'podcasts';

export const ADD_BY_RSS_LIBRARY_SORT_OPTIONS = ['alphabetical', 'recent'] as const;

export type AddByRssLibrarySortOption = (typeof ADD_BY_RSS_LIBRARY_SORT_OPTIONS)[number];

export const DEFAULT_ADD_BY_RSS_LIBRARY_SORT: AddByRssLibrarySortOption = 'alphabetical';

export const ADD_BY_RSS_LIBRARY_VIEW_MODES = ['list', 'grid'] as const;

export type AddByRssLibraryViewMode = (typeof ADD_BY_RSS_LIBRARY_VIEW_MODES)[number];

export const DEFAULT_ADD_BY_RSS_LIBRARY_VIEW_MODE: AddByRssLibraryViewMode = 'list';

export const isAddByRssLibraryMediaType = (value: string): value is AddByRssLibraryMediaType => {
  return ADD_BY_RSS_LIBRARY_MEDIA_TYPES.some((mediaType) => mediaType === value);
};

/** Livestreams has no sort. Every other library chip offers A-Z and Recent. */
export const isAddByRssLibrarySortableMediaType = (
  mediaType: AddByRssLibraryMediaType
): boolean => {
  return mediaType !== 'livestreams';
};

/** Channel chips can draw as an artwork grid; item chips share covers across rows. */
export const isAddByRssLibraryViewModeMediaType = (
  mediaType: AddByRssLibraryMediaType
): boolean => {
  return isChannelListViewModeType(mediaType);
};

/** Title filter is honest only for channel chips held in full on the device. */
export const isAddByRssLibraryFilterMediaType = (mediaType: AddByRssLibraryMediaType): boolean => {
  return mediaType === 'podcasts' || mediaType === 'artists' || mediaType === 'albums';
};

const buildSortScope = (mediaType: AddByRssLibraryMediaType): SortPrefScope => {
  return { kind: 'list', name: `add-by-rss-${mediaType}` };
};

const buildViewModeScope = (mediaType: AddByRssLibraryMediaType): SortPrefScope => {
  return { kind: 'list', name: `add-by-rss-${mediaType}-layout` };
};

const isSortOption = (value: string): value is AddByRssLibrarySortOption => {
  return ADD_BY_RSS_LIBRARY_SORT_OPTIONS.some((option) => option === value);
};

const isViewMode = (value: string): value is AddByRssLibraryViewMode => {
  return ADD_BY_RSS_LIBRARY_VIEW_MODES.some((option) => option === value);
};

export type AddByRssLibraryListPrefs = {
  sort: AddByRssLibrarySortOption;
  viewMode: AddByRssLibraryViewMode;
};

export const readAddByRssLibraryListPrefs = async (
  mediaType: AddByRssLibraryMediaType
): Promise<AddByRssLibraryListPrefs> => {
  const stored = await readSortPref(buildSortScope(mediaType));
  const sort =
    stored?.sort !== undefined && isSortOption(stored.sort)
      ? stored.sort
      : DEFAULT_ADD_BY_RSS_LIBRARY_SORT;

  let viewMode: AddByRssLibraryViewMode = DEFAULT_ADD_BY_RSS_LIBRARY_VIEW_MODE;
  if (isAddByRssLibraryViewModeMediaType(mediaType)) {
    const layout = await readSortPref(buildViewModeScope(mediaType));
    if (layout?.viewMode !== undefined && isViewMode(layout.viewMode)) {
      viewMode = layout.viewMode;
    }
  }

  return { sort, viewMode };
};

export const writeAddByRssLibrarySort = async (
  mediaType: AddByRssLibraryMediaType,
  sort: AddByRssLibrarySortOption
): Promise<void> => {
  await writeSortPref(buildSortScope(mediaType), { sort });
};

export const writeAddByRssLibraryViewMode = async (
  mediaType: AddByRssLibraryMediaType,
  viewMode: AddByRssLibraryViewMode
): Promise<void> => {
  if (!isAddByRssLibraryViewModeMediaType(mediaType)) {
    return;
  }
  await writeSortPref(buildViewModeScope(mediaType), { viewMode });
};

export const subscribeAddByRssLibraryListPrefs = (
  mediaType: AddByRssLibraryMediaType,
  listener: () => void
): (() => void) => {
  return subscribeSortPref(buildSortScope(mediaType), listener);
};
