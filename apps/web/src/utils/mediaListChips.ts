import type { SortPrefScope } from '@podverse/helpers';
import {
  BROWSE_LIST_VIEW_MODE_SCOPE_ALBUMS,
  BROWSE_LIST_VIEW_MODE_SCOPE_ARTISTS,
  BROWSE_LIST_VIEW_MODE_SCOPE_PODCASTS,
  HOME_LIST_VIEW_MODE_SCOPE_ALBUMS,
  HOME_LIST_VIEW_MODE_SCOPE_ARTISTS,
  HOME_LIST_VIEW_MODE_SCOPE_PODCASTS,
  pickSortPrefToken,
  recommendationsListViewModeScope,
} from '@podverse/helpers';

import { ROUTES } from '../constants/routes';
import type { FilterDefaultsPage, LocalSettingsState } from './localSettings/localSettings';
import { getStoredSortPref, updateStoredSortPref } from './localSettings/localSettings';

/** Subscribed chips, in mobile Home order. The first chip is the page default. */
export const SUBSCRIBED_CHIPS = [
  'podcasts',
  'episodes',
  'clips',
  'artists',
  'albums',
  'tracks',
  'livestreams',
] as const;

/** Browse chips, in mobile Browse order. */
export const BROWSE_CHIPS = [...SUBSCRIBED_CHIPS, 'playlists', 'users'] as const;

/** Add by RSS library chips, in mobile library order. */
export const ADD_BY_RSS_CHIPS = [
  'podcasts',
  'episodes',
  'artists',
  'albums',
  'tracks',
  'livestreams',
] as const;

/** Recommendations chips. Taste Profile scores shows only. */
export const RECOMMENDATION_CHIPS = ['podcasts', 'albums', 'artists'] as const;

/** One chip Subscribed can show. */
export type SubscribedChip = (typeof SUBSCRIBED_CHIPS)[number];

/** One chip Browse can show. */
export type BrowseChip = (typeof BROWSE_CHIPS)[number];

/** One chip the Add by RSS library can show. */
export type AddByRSSChip = (typeof ADD_BY_RSS_CHIPS)[number];

/** Any chip a media-list page can show. */
export type MediaListChip = SubscribedChip | BrowseChip | AddByRSSChip;

/** Which chips page is on screen. */
export type MediaListChipsPage = 'subscribed' | 'browse' | 'add-by-rss' | 'recommendations';

/** Subscribed lists the account. Browse lists the directory. */
export type MediaListScope = 'subscribed' | 'browse';

/** A Browse list whose first page loaded with no rows shows its empty message. */
export function shouldShowBrowseEmptyMessage({
  isBrowse,
  isLoading,
  page,
  rowCount,
}: {
  isBrowse: boolean;
  isLoading: boolean;
  page: number;
  rowCount: number;
}): boolean {
  return isBrowse && !isLoading && page <= 1 && rowCount === 0;
}

/** Query parameter that names the selected chip. */
export const MEDIA_LIST_CHIP_QUERY_PARAM = 'tab';

/** Chip used when the URL and the store do not name one. */
export const DEFAULT_MEDIA_LIST_CHIP = 'podcasts';

/** Catalog key for each chip label. */
export const MEDIA_LIST_CHIP_LABEL_KEYS = {
  podcasts: 'media.podcast.podcasts',
  episodes: 'media.podcast.episodes',
  clips: 'features.clip.clips',
  artists: 'media.music.artists',
  albums: 'media.music.albums',
  tracks: 'media.music.tracks',
  livestreams: 'media.livestream.livestreams',
  playlists: 'features.playlist.playlists',
  users: 'features.browse.users',
} as const satisfies Record<MediaListChip, string>;

/** Sort-pref scope that remembers the chip on each page. */
export const MEDIA_LIST_CHIP_SCOPES: Record<MediaListChipsPage, SortPrefScope> = {
  subscribed: { kind: 'list', name: 'home' },
  browse: { kind: 'list', name: 'browse' },
  'add-by-rss': { kind: 'list', name: 'add-by-rss' },
  recommendations: { kind: 'list', name: 'recommendations' },
};

/** Base path for each chips page. */
export const MEDIA_LIST_CHIP_BASE_PATHS: Record<MediaListChipsPage, string> = {
  subscribed: ROUTES.HOME,
  browse: ROUTES.BROWSE,
  'add-by-rss': ROUTES.ADD_BY_RSS,
  recommendations: ROUTES.RECOMMENDATIONS,
};

/** URL for a chip. The default chip is the base path with no query. */
export function buildMediaListChipPath(page: MediaListChipsPage, chip: MediaListChip): string {
  const base = MEDIA_LIST_CHIP_BASE_PATHS[page];
  if (chip === DEFAULT_MEDIA_LIST_CHIP) {
    return base;
  }
  return `${base}?${MEDIA_LIST_CHIP_QUERY_PARAM}=${chip}`;
}

/** Chip to show, and the URL chip when that value is one this page offers. */
export function resolveMediaListChip<T extends string>({
  chips,
  urlValue,
  storedValue,
  defaultChip,
}: {
  chips: readonly T[];
  urlValue: string | string[] | undefined;
  storedValue: string | undefined;
  defaultChip: T;
}): { chip: T; urlChip: T | null } {
  const rawUrlValue = Array.isArray(urlValue) ? urlValue[0] : urlValue;
  const urlChip = chips.find((chip) => chip === rawUrlValue) ?? null;
  const chip = urlChip ?? pickSortPrefToken(storedValue, chips, defaultChip);
  return { chip, urlChip };
}

/** Stored chip token for a page, or undefined when the page has none. */
export function readStoredMediaListChip(
  settings: LocalSettingsState,
  page: MediaListChipsPage
): string | undefined {
  return getStoredSortPref(settings, MEDIA_LIST_CHIP_SCOPES[page])?.mediaType;
}

/** Remember a chip. The default chip clears the stored token. */
export function writeMediaListChip(page: MediaListChipsPage, chip: MediaListChip): void {
  const mediaType = chip === DEFAULT_MEDIA_LIST_CHIP ? undefined : chip;
  updateStoredSortPref(MEDIA_LIST_CHIP_SCOPES[page], { mediaType });
}

/**
 * Trailing controls a media-list chip mounts. Known from the page and chip alone, so the row can
 * show Sort and the gear on the click before the list arrives.
 */
export type MediaListChipChrome = {
  showCategory: boolean;
  showSort: boolean;
  showViewSelector: boolean;
  showPlaylistsMedium: boolean;
  /** Cookie key for remembered sort, or null when Sort is not stored that way. */
  filterDefaultsPage: FilterDefaultsPage | null;
  /** List vs grid for this chip. Null uses the app-wide setting. */
  viewModeScope: SortPrefScope | null;
};

const CHANNEL_VIEW_MODE_SCOPES = {
  subscribed: {
    podcasts: HOME_LIST_VIEW_MODE_SCOPE_PODCASTS,
    artists: HOME_LIST_VIEW_MODE_SCOPE_ARTISTS,
    albums: HOME_LIST_VIEW_MODE_SCOPE_ALBUMS,
  },
  browse: {
    podcasts: BROWSE_LIST_VIEW_MODE_SCOPE_PODCASTS,
    artists: BROWSE_LIST_VIEW_MODE_SCOPE_ARTISTS,
    albums: BROWSE_LIST_VIEW_MODE_SCOPE_ALBUMS,
  },
} as const;

const emptyChrome = (): MediaListChipChrome => ({
  showCategory: false,
  showSort: false,
  showViewSelector: false,
  showPlaylistsMedium: false,
  filterDefaultsPage: null,
  viewModeScope: null,
});

/** Trailing chrome for one chip on a chips page. */
export function mediaListChipChrome(
  page: MediaListChipsPage,
  chip: MediaListChip
): MediaListChipChrome {
  if (page === 'recommendations') {
    if (chip !== 'podcasts' && chip !== 'albums' && chip !== 'artists') {
      return emptyChrome();
    }
    return {
      ...emptyChrome(),
      showViewSelector: true,
      viewModeScope: recommendationsListViewModeScope(chip),
    };
  }

  if (page === 'add-by-rss') {
    if (chip === 'livestreams' || chip === 'playlists' || chip === 'users' || chip === 'clips') {
      return emptyChrome();
    }
    return {
      ...emptyChrome(),
      showSort: true,
      showViewSelector: true,
      viewModeScope: null,
    };
  }

  if (chip === 'livestreams') {
    return emptyChrome();
  }

  if (page === 'browse' && chip === 'playlists') {
    return {
      ...emptyChrome(),
      showSort: true,
      showPlaylistsMedium: true,
      filterDefaultsPage: 'browse-playlists',
    };
  }

  if (page === 'browse' && chip === 'users') {
    return {
      ...emptyChrome(),
      showSort: true,
      filterDefaultsPage: 'browse-users',
    };
  }

  const isBrowse = page === 'browse';
  const showCategory =
    isBrowse && (chip === 'podcasts' || chip === 'episodes' || chip === 'clips');
  const showViewSelector =
    chip === 'podcasts' ||
    chip === 'episodes' ||
    chip === 'artists' ||
    chip === 'albums' ||
    chip === 'tracks';

  const filterDefaultsPage: FilterDefaultsPage | null = (() => {
    if (chip === 'podcasts') {
      return isBrowse ? 'podcasts' : 'subscribed-podcasts';
    }
    if (chip === 'episodes') {
      return isBrowse ? 'episodes' : 'subscribed-episodes';
    }
    if (chip === 'clips') {
      return isBrowse ? 'clips' : 'subscribed-clips';
    }
    if (chip === 'artists') {
      return isBrowse ? 'artists' : 'subscribed-artists';
    }
    if (chip === 'albums') {
      return isBrowse ? 'albums' : 'subscribed-albums';
    }
    if (chip === 'tracks') {
      return isBrowse ? 'tracks' : 'subscribed-tracks';
    }
    return null;
  })();

  const viewModeScope: SortPrefScope | null = (() => {
    if (chip !== 'podcasts' && chip !== 'artists' && chip !== 'albums') {
      return null;
    }
    return CHANNEL_VIEW_MODE_SCOPES[isBrowse ? 'browse' : 'subscribed'][chip];
  })();

  return {
    showCategory,
    showSort: true,
    showViewSelector,
    showPlaylistsMedium: false,
    filterDefaultsPage,
    viewModeScope,
  };
}
