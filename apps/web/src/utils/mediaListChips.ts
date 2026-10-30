import type { SortPrefScope } from '@podverse/helpers';
import { pickSortPrefToken } from '@podverse/helpers';

import { ROUTES } from '../constants/routes';
import type { LocalSettingsState } from './localSettings/localSettings';
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
