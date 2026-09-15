import { MediumEnum } from './medium.js';

/**
 * Canonical web app path prefixes. Use builders (`buildEpisodePath`, etc.) for detail URLs.
 * Surfaces that need only a prefix (push payloads) use these constants directly.
 */
export const APP_ROUTES = {
  ALBUM: '/album',
  ARTIST: '/artist',
  CHANNEL: '/channel',
  CHAPTER: '/chapter',
  CLIP: '/clip',
  EPISODE: '/episode',
  MEMBERSHIP: '/membership',
  MEMBERSHIP_RENEW: '/membership/renew',
  MUSIC_LIVESTREAM: '/music/livestream',
  OFFICIAL_CLIP: '/official-clip',
  PLAYLIST: '/playlist',
  PODCAST: '/podcast',
  PODCAST_LIVESTREAM: '/podcast/livestream',
  PROFILE: '/profile',
  POPULARITY_TRACKING: '/popularity-tracking',
  SETTINGS: '/settings',
  TRACK: '/track',
  VIDEO: '/video',
} as const;

export type AppRouteKey = keyof typeof APP_ROUTES;
export type AppRoutePath = (typeof APP_ROUTES)[AppRouteKey];

export const buildAppRoutePath = (base: AppRoutePath, idText: string): string =>
  `${base}/${idText}`;

export const buildAlbumPath = (idText: string): string =>
  buildAppRoutePath(APP_ROUTES.ALBUM, idText);

export const buildArtistPath = (idText: string): string =>
  buildAppRoutePath(APP_ROUTES.ARTIST, idText);

export const buildChannelPath = (idText: string): string =>
  buildAppRoutePath(APP_ROUTES.CHANNEL, idText);

export const buildChapterPath = (idText: string): string =>
  buildAppRoutePath(APP_ROUTES.CHAPTER, idText);

export const buildClipPath = (idText: string): string => buildAppRoutePath(APP_ROUTES.CLIP, idText);

export const buildEpisodePath = (idText: string): string =>
  buildAppRoutePath(APP_ROUTES.EPISODE, idText);

export const buildMusicLivestreamPath = (idText: string): string =>
  buildAppRoutePath(APP_ROUTES.MUSIC_LIVESTREAM, idText);

export const buildOfficialClipPath = (idText: string): string =>
  buildAppRoutePath(APP_ROUTES.OFFICIAL_CLIP, idText);

export const buildPlaylistPath = (idText: string): string =>
  buildAppRoutePath(APP_ROUTES.PLAYLIST, idText);

export const buildPodcastPath = (idText: string): string =>
  buildAppRoutePath(APP_ROUTES.PODCAST, idText);

export const buildPodcastLivestreamPath = (idText: string): string =>
  buildAppRoutePath(APP_ROUTES.PODCAST_LIVESTREAM, idText);

export const buildProfilePath = (idText: string): string =>
  buildAppRoutePath(APP_ROUTES.PROFILE, idText);

export const buildTrackPath = (idText: string): string =>
  buildAppRoutePath(APP_ROUTES.TRACK, idText);

export const buildVideoPath = (idText: string): string =>
  buildAppRoutePath(APP_ROUTES.VIDEO, idText);

/**
 * Mobile Home-tab path prefix. Content deep links are scoped here so they sit on the Home stack
 * (`/home/podcast/:id`) rather than as a second copy of the web path.
 */
export const MOBILE_HOME_TAB_PATH = '/home';

const splitRoutePath = (path: string): string[] => {
  return path.split('/').filter((segment) => segment.length > 0);
};

export const MOBILE_HOME_TAB_SEGMENT = splitRoutePath(MOBILE_HOME_TAB_PATH)[0] ?? 'home';

export const FLAT_CONTENT_APP_ROUTES = [
  APP_ROUTES.ALBUM,
  APP_ROUTES.ARTIST,
  APP_ROUTES.CLIP,
  APP_ROUTES.EPISODE,
  APP_ROUTES.PODCAST,
  APP_ROUTES.TRACK,
] as const;

export const getAppRouteSegments = (route: AppRoutePath): string[] => {
  return splitRoutePath(route);
};

export const getAppRouteFirstSegment = (route: AppRoutePath): string | null => {
  return getAppRouteSegments(route)[0] ?? null;
};

export const matchesAppRouteSegments = (
  segments: readonly string[],
  route: AppRoutePath,
  startIndex = 0
): boolean => {
  const expected = getAppRouteSegments(route);
  if (expected.length === 0) {
    return false;
  }
  return expected.every((value, index) => segments[startIndex + index] === value);
};

export const isFlatContentAppRouteSegment = (segment: string | undefined): boolean => {
  if (segment === undefined) {
    return false;
  }
  return FLAT_CONTENT_APP_ROUTES.some((route) => getAppRouteFirstSegment(route) === segment);
};

export const buildMobileHomeScopedPath = (route: AppRoutePath, idText: string): string => {
  return `${MOBILE_HOME_TAB_PATH}${buildAppRoutePath(route, idText)}`;
};

export const buildMobileHomePodcastEpisodePath = (podcastId: string, episodeId: string): string => {
  return `${MOBILE_HOME_TAB_PATH}${APP_ROUTES.PODCAST}/${podcastId}${APP_ROUTES.EPISODE}/${episodeId}`;
};

export const buildMobileHomeAlbumTrackPath = (albumId: string, trackId: string): string => {
  return `${MOBILE_HOME_TAB_PATH}${APP_ROUTES.ALBUM}/${albumId}${APP_ROUTES.TRACK}/${trackId}`;
};

/** Message types that map to in-app / push deep-link paths. */
export type NotificationLinkMessageType =
  | 'new'
  | 'new-episode'
  | 'new-podcast'
  | 'new-video'
  | 'new-video-channel'
  | 'new-track'
  | 'new-album'
  | 'livestream-started'
  | 'livestream-scheduled';

export const getNotificationLinkPathPrefix = (
  messageType: NotificationLinkMessageType,
  mediumId: number
): AppRoutePath | null => {
  switch (messageType) {
    case 'new-episode':
      return APP_ROUTES.EPISODE;
    case 'new-podcast':
      return APP_ROUTES.PODCAST;
    case 'new-video':
      return APP_ROUTES.VIDEO;
    case 'new-video-channel':
      return APP_ROUTES.CHANNEL;
    case 'new-track':
      return APP_ROUTES.TRACK;
    case 'new-album':
      return APP_ROUTES.ALBUM;
    case 'livestream-started':
    case 'livestream-scheduled':
      return mediumId === MediumEnum.Music
        ? APP_ROUTES.MUSIC_LIVESTREAM
        : APP_ROUTES.PODCAST_LIVESTREAM;
    case 'new':
    default:
      return null;
  }
};

export const buildNotificationLinkPath = (params: {
  messageType: NotificationLinkMessageType;
  mediumId: number;
  itemIdText: string;
  channelIdText: string;
}): string | null => {
  const prefix = getNotificationLinkPathPrefix(params.messageType, params.mediumId);
  if (prefix === null) {
    return null;
  }

  switch (params.messageType) {
    case 'livestream-started':
    case 'livestream-scheduled':
    case 'new-episode':
    case 'new-podcast':
    case 'new-video':
    case 'new-video-channel':
    case 'new-track':
    case 'new-album':
      return buildAppRoutePath(prefix, params.itemIdText);
    case 'new':
    default:
      return null;
  }
};
