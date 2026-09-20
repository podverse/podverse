import type { PodcastTab } from '../prefs/detailListPrefs';
import type { HomeMediaType } from '../prefs/preferredMediaType';

/**
 * Pure helpers that decide how each surface behaves while Offline Mode is on. Screens call these
 * rather than inventing their own rules so Browse / Search / Home / podcast detail stay consistent.
 *
 * Every helper here is driven by the **user's toggle** — `isForced` from `useOfflineStatus`, or
 * `isOfflineModeEnabled()` outside React. Never by a network reading. Rearranging somebody's tabs
 * and sections because their signal dipped would move the app under them for a condition they did
 * not choose and cannot undo, and it would move it back a moment later.
 *
 * A screen that cannot work without the network keeps attempting while the network is merely down,
 * and shows an offline-flavored error with Retry through its own `ListError` / `RetryableError`
 * chrome. Attempting is also the only reliable way to learn the network is back.
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
type HomeDownloadedItemMediaType = Extract<HomeMediaType, 'episodes' | 'tracks'>;

export const isHomeChannelListOfflineCompatible = (mediaType: HomeMediaType): boolean =>
  HOME_CHANNEL_MEDIA_TYPES.has(mediaType);

export const isHomeDownloadedItemsOnly = (
  mediaType: HomeMediaType
): mediaType is HomeDownloadedItemMediaType => mediaType === 'episodes' || mediaType === 'tracks';

export const isHomeClipsUnavailableOffline = (mediaType: HomeMediaType): boolean =>
  mediaType === 'clips';

/**
 * Podcast section to show while Offline Mode is on. Always prefers Downloaded when that chip
 * exists, overriding the remembered tab without writing it back — turning Offline Mode off
 * restores the stored preference. About and other local panes stay selectable after the user taps.
 *
 * Call this only for the user's toggle. A dropped signal leaves the remembered section alone.
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
  tab: 'summary' | 'chapters' | 'clips' | 'soundbites' | 'transcript' | 'funding'
): boolean => {
  return tab === 'chapters' || tab === 'clips' || tab === 'soundbites' || tab === 'transcript';
};

export const OFFLINE_UNAVAILABLE_MESSAGE_KEY = 'settings.offline_mode.unavailable' as const;
