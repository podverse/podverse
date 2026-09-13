import type { HomeMediaType } from '../prefs/preferredMediaType';
import type { PodcastTab } from '../prefs/detailListPrefs';

/**
 * Pure helpers that decide how each surface behaves while Offline Mode is on. Screens call these
 * rather than inventing their own rules so Browse / Search / Home / podcast detail stay consistent.
 */

/** Screens that need the network and show the unavailable fill while Offline Mode is on. */
export type OfflineUnavailableSurface =
  | 'browse'
  | 'search'
  | 'home_clips'
  | 'playlists'
  | 'profile_other'
  | 'opml_import'
  | 'add_by_rss_add'
  | 'podcast_clips'
  | 'podcast_soundbites'
  | 'podcast_podroll';

/** Home media types that keep listing local subscribed channels while Offline Mode is on. */
const HOME_CHANNEL_MEDIA_TYPES: ReadonlySet<HomeMediaType> = new Set([
  'podcasts',
  'artists',
  'albums',
]);

/** Home media types that narrow to completed downloads only. */
const HOME_DOWNLOADED_ITEM_MEDIA_TYPES: ReadonlySet<HomeMediaType> = new Set([
  'episodes',
  'tracks',
]);

export const isHomeChannelListOfflineCompatible = (mediaType: HomeMediaType): boolean =>
  HOME_CHANNEL_MEDIA_TYPES.has(mediaType);

export const isHomeDownloadedItemsOnly = (mediaType: HomeMediaType): boolean =>
  HOME_DOWNLOADED_ITEM_MEDIA_TYPES.has(mediaType);

export const isHomeClipsUnavailableOffline = (mediaType: HomeMediaType): boolean =>
  mediaType === 'clips';

/**
 * Podcast section to show while Offline Mode is on. Always prefers Downloaded when that chip
 * exists, overriding the remembered tab without writing it back — turning Offline Mode off
 * restores the stored preference. About and other local panes stay selectable after the user taps.
 */
export const resolvePodcastSectionForOfflineMode = (
  _rememberedSection: PodcastTab,
  availableSections: readonly PodcastTab[]
): PodcastTab => {
  if (availableSections.includes('downloaded')) {
    return 'downloaded';
  }
  if (availableSections.includes('episodes')) {
    return 'episodes';
  }
  return availableSections[0] ?? 'downloaded';
};

/** Podcast panes that need the network and cannot render from local storage alone. */
export const isPodcastSectionUnavailableOffline = (section: PodcastTab): boolean => {
  return section === 'clips' || section === 'soundbites' || section === 'podroll';
};

/**
 * Episode panes that need a network fetch for their body. Summary always renders from the stored
 * item. Official clips may still paint when the item DTO already embeds `item_soundbites`.
 */
export const isEpisodeTabNetworkBody = (
  tab: 'summary' | 'chapters' | 'clips' | 'soundbites' | 'transcript'
): boolean => {
  return tab === 'chapters' || tab === 'clips' || tab === 'soundbites' || tab === 'transcript';
};

export const OFFLINE_UNAVAILABLE_MESSAGE_KEY = 'settings.offline_mode.unavailable' as const;
