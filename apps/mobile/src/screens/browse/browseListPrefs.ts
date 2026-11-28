import type { SortPrefScope, SortPrefValue } from '@podverse/helpers';
import { browseListScope, isChannelListViewModeType, pickSortPrefToken } from '@podverse/helpers';
import { normalizePlaylistTagName } from '@podverse/helpers/playlistTag';

import type { HomeViewMode } from '../../prefs/homeListPrefs';
import { HOME_VIEW_MODES } from '../../prefs/homeListPrefs';
import { readSortPref, subscribeSortPref, writeSortPref } from '../../prefs/sortPrefs';
import type { BrowseMediaType, BrowseRangeOption, BrowseSortOption } from './browseTypes';
import {
  BROWSE_MEDIA_TYPE_ORDER,
  BROWSE_RANGE_OPTIONS,
  BROWSE_SORT_OPTIONS,
  DEFAULT_BROWSE_RANGE,
  defaultBrowseMediaType,
  defaultBrowseSort,
  defaultBrowseViewMode,
  isBrowseMediaType,
  isBrowseSortableMediaType,
} from './browseTypes';

/**
 * Browse's remembered selections. The root entry holds the selected media type and category,
 * which every list shares. Each media type has its own entry (`browseListScope`) for its sort,
 * its Top window, and its list or grid, the same split Home uses. The playlists entry also
 * remembers the applied tag.
 */
const BROWSE_ROOT_SCOPE: SortPrefScope = { kind: 'list', name: 'browse' };

export type BrowseListPrefs = {
  category: string | null;
  /** The media type `range`, `sort`, `tag`, and `viewMode` belong to. */
  mediaType: BrowseMediaType;
  range: BrowseRangeOption;
  sort: BrowseSortOption;
  /** Folded playlist tag on Browse playlists. Every other media type reads `null`. */
  tag: string | null;
  viewMode: HomeViewMode;
};

/**
 * Media types that can draw as an artwork grid on Browse.
 *
 * Episodes, tracks, clips, livestreams, playlists, and users are list-only — a tile cannot name
 * the row.
 */
export const isBrowseViewModeMediaType = (mediaType: BrowseMediaType): boolean => {
  return mediaType === 'people' || isChannelListViewModeType(mediaType);
};

const isHomeViewMode = (value: string): value is HomeViewMode => {
  return HOME_VIEW_MODES.some((mode) => mode === value);
};

const resolveBrowseViewMode = (
  mediaType: BrowseMediaType,
  root: SortPrefValue | null,
  entry: SortPrefValue | null
): HomeViewMode => {
  if (isChannelListViewModeType(mediaType)) {
    if (entry?.viewMode !== undefined && isHomeViewMode(entry.viewMode)) {
      return entry.viewMode;
    }
  }

  if (!isChannelListViewModeType(mediaType)) {
    return 'list';
  }

  if (root?.viewMode !== undefined && isHomeViewMode(root.viewMode)) {
    return root.viewMode;
  }

  return defaultBrowseViewMode();
};

export const readBrowseListPrefs = async (): Promise<BrowseListPrefs> => {
  const root = await readSortPref(BROWSE_ROOT_SCOPE);
  const mediaType =
    root?.mediaType !== undefined && isBrowseMediaType(root.mediaType)
      ? root.mediaType
      : defaultBrowseMediaType();
  const entry = await readSortPref(browseListScope(mediaType));

  let tag: string | null = null;
  if (mediaType === 'playlists' && entry?.tag !== undefined) {
    const folded = normalizePlaylistTagName(entry.tag);
    tag = folded.ok ? folded.name : null;
  }

  return {
    category: root?.category !== undefined ? root.category : null,
    mediaType,
    range: pickSortPrefToken(entry?.range, BROWSE_RANGE_OPTIONS, DEFAULT_BROWSE_RANGE),
    sort: pickSortPrefToken(entry?.sort, BROWSE_SORT_OPTIONS, defaultBrowseSort()),
    tag,
    viewMode: resolveBrowseViewMode(mediaType, root, entry),
  };
};

export const writeBrowseMediaType = async (mediaType: BrowseMediaType): Promise<void> => {
  await writeSortPref(BROWSE_ROOT_SCOPE, { mediaType });
};

export const writeBrowseCategory = async (category: string | null): Promise<void> => {
  await writeSortPref(BROWSE_ROOT_SCOPE, {
    category: category === null ? undefined : category,
  });
};

export const writeBrowseSort = async (
  mediaType: BrowseMediaType,
  sort: BrowseSortOption
): Promise<void> => {
  if (!isBrowseSortableMediaType(mediaType)) {
    return;
  }

  await writeSortPref(browseListScope(mediaType), { sort });
};

/**
 * The applied tag on Browse playlists. Null clears that field and leaves sort and range.
 * Any other media type is left alone. A name that does not fold is left alone.
 */
export const writeBrowsePlaylistTag = async (
  mediaType: BrowseMediaType,
  tag: string | null
): Promise<void> => {
  if (mediaType !== 'playlists') {
    return;
  }

  if (tag === null) {
    await writeSortPref(browseListScope('playlists'), { tag: undefined });
    return;
  }

  const folded = normalizePlaylistTagName(tag);
  if (!folded.ok) {
    return;
  }

  await writeSortPref(browseListScope('playlists'), { tag: folded.name });
};

/**
 * A window is chosen only from Top's range sheet, so choosing one also selects Top for this
 * media type. The window stays while Recent is selected, so returning to Top opens on it.
 */
export const writeBrowseRange = async (
  mediaType: BrowseMediaType,
  range: BrowseRangeOption
): Promise<void> => {
  if (!isBrowseSortableMediaType(mediaType)) {
    return;
  }

  await writeSortPref(browseListScope(mediaType), { range, sort: 'top' });
};

export const writeBrowseViewMode = async (
  mediaType: BrowseMediaType,
  viewMode: HomeViewMode
): Promise<void> => {
  if (!isChannelListViewModeType(mediaType)) {
    return;
  }

  await writeSortPref(browseListScope(mediaType), { viewMode });
};

export const subscribeBrowseListPrefs = (listener: () => void): (() => void) => {
  const unsubscribeRoot = subscribeSortPref(BROWSE_ROOT_SCOPE, listener);
  const unsubscribeEntries = BROWSE_MEDIA_TYPE_ORDER.map((mediaType) =>
    subscribeSortPref(browseListScope(mediaType), listener)
  );

  return () => {
    unsubscribeRoot();
    for (const unsubscribe of unsubscribeEntries) {
      unsubscribe();
    }
  };
};
