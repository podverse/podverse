import type { NotificationLinkMessageType } from './appRoutes.js';
import {
  APP_ROUTES,
  buildAlbumPath,
  buildAppRoutePath,
  buildChannelPath,
  buildEpisodePath,
  buildMobileHomeAlbumTrackPath,
  buildMobileHomePodcastEpisodePath,
  buildMobileHomeScopedPath,
  buildNotificationLinkPath,
  buildPodcastLivestreamPath,
  buildPodcastPath,
  buildTrackPath,
  buildVideoPath,
  MOBILE_HOME_TAB_PATH,
} from './appRoutes.js';
import { MediumEnum } from './medium.js';

export type NotificationDestinationKind =
  'album' | 'channel' | 'episode' | 'home' | 'livestream' | 'path' | 'podcast' | 'track' | 'video';

export type NotificationDestination = {
  kind: NotificationDestinationKind;
  /**
   * Web app path (or `/` for Home). Campaigns and unknown types keep whatever
   * explicit path they already carry.
   */
  webPath: string;
  /**
   * Home-tab stack path for mobile (`/home/podcast/:channel/episode/:item`).
   * Campaign / unknown destinations leave this null so mobile can map `webPath`.
   */
  mobileStackPath: string | null;
  channelIdText: string | null;
  itemIdText: string | null;
};

const NOTIFICATION_LINK_MESSAGE_TYPES: readonly NotificationLinkMessageType[] = [
  'new',
  'new-episode',
  'new-podcast',
  'new-video',
  'new-video-channel',
  'new-track',
  'new-album',
  'livestream-started',
  'livestream-scheduled',
];

const RESOURCE_TYPE_DESTINATIONS = {
  album: { kind: 'album', mobileRoute: APP_ROUTES.ALBUM, webRoute: APP_ROUTES.ALBUM },
  artist: { kind: 'channel', mobileRoute: APP_ROUTES.ARTIST, webRoute: APP_ROUTES.ARTIST },
  channel: { kind: 'channel', mobileRoute: APP_ROUTES.PODCAST, webRoute: APP_ROUTES.CHANNEL },
  clip: { kind: 'path', mobileRoute: APP_ROUTES.CLIP, webRoute: APP_ROUTES.CLIP },
  episode: { kind: 'episode', mobileRoute: APP_ROUTES.EPISODE, webRoute: APP_ROUTES.EPISODE },
  playlist: { kind: 'path', mobileRoute: null, webRoute: APP_ROUTES.PLAYLIST },
  podcast: { kind: 'podcast', mobileRoute: APP_ROUTES.PODCAST, webRoute: APP_ROUTES.PODCAST },
  profile: { kind: 'path', mobileRoute: null, webRoute: APP_ROUTES.PROFILE },
  track: { kind: 'track', mobileRoute: APP_ROUTES.TRACK, webRoute: APP_ROUTES.TRACK },
  video: { kind: 'video', mobileRoute: APP_ROUTES.EPISODE, webRoute: APP_ROUTES.VIDEO },
} as const;

type ResourceTypeKey = keyof typeof RESOURCE_TYPE_DESTINATIONS;

const isResourceTypeKey = (value: string): value is ResourceTypeKey => {
  return Object.prototype.hasOwnProperty.call(RESOURCE_TYPE_DESTINATIONS, value);
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asMediumId = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

export const isNotificationLinkMessageType = (
  value: string
): value is NotificationLinkMessageType => {
  return (NOTIFICATION_LINK_MESSAGE_TYPES as readonly string[]).includes(value);
};

const HOME_DESTINATION: NotificationDestination = {
  channelIdText: null,
  itemIdText: null,
  kind: 'home',
  mobileStackPath: MOBILE_HOME_TAB_PATH,
  webPath: '/',
};

const withWebPath = (
  destination: Omit<NotificationDestination, 'webPath'>,
  messageType: NotificationLinkMessageType,
  mediumId: number,
  fallbackPath: string
): NotificationDestination => {
  const built = buildNotificationLinkPath({
    channelIdText: destination.channelIdText ?? '',
    itemIdText: destination.itemIdText ?? '',
    mediumId,
    messageType,
  });
  return {
    ...destination,
    webPath: built ?? fallbackPath,
  };
};

export const resolveNotificationDestination = (params: {
  messageType?: string | null;
  mediumId?: number | null;
  itemIdText?: string | null;
  channelIdText?: string | null;
  linkPath?: string | null;
}): NotificationDestination => {
  const messageType = asNonEmptyString(params.messageType);
  const itemIdText = asNonEmptyString(params.itemIdText);
  const channelIdText = asNonEmptyString(params.channelIdText);
  const linkPath = asNonEmptyString(params.linkPath);
  const mediumId = params.mediumId ?? MediumEnum.Podcast;

  if (messageType !== null && isNotificationLinkMessageType(messageType)) {
    if (messageType === 'new-episode' || messageType === 'new-video') {
      if (itemIdText !== null && channelIdText !== null) {
        return withWebPath(
          {
            channelIdText,
            itemIdText,
            kind: messageType === 'new-video' ? 'video' : 'episode',
            mobileStackPath: buildMobileHomePodcastEpisodePath(channelIdText, itemIdText),
          },
          messageType,
          mediumId,
          messageType === 'new-video' ? buildVideoPath(itemIdText) : buildEpisodePath(itemIdText)
        );
      }
      if (itemIdText !== null) {
        return withWebPath(
          {
            channelIdText: null,
            itemIdText,
            kind: messageType === 'new-video' ? 'video' : 'episode',
            mobileStackPath: buildMobileHomeScopedPath(APP_ROUTES.EPISODE, itemIdText),
          },
          messageType,
          mediumId,
          messageType === 'new-video' ? buildVideoPath(itemIdText) : buildEpisodePath(itemIdText)
        );
      }
    }

    if (messageType === 'livestream-started' || messageType === 'livestream-scheduled') {
      if (itemIdText !== null && channelIdText !== null) {
        return withWebPath(
          {
            channelIdText,
            itemIdText,
            kind: 'livestream',
            mobileStackPath: buildMobileHomePodcastEpisodePath(channelIdText, itemIdText),
          },
          messageType,
          mediumId,
          buildPodcastLivestreamPath(itemIdText)
        );
      }
      if (itemIdText !== null) {
        return withWebPath(
          {
            channelIdText: null,
            itemIdText,
            kind: 'livestream',
            mobileStackPath: buildMobileHomeScopedPath(APP_ROUTES.EPISODE, itemIdText),
          },
          messageType,
          mediumId,
          buildPodcastLivestreamPath(itemIdText)
        );
      }
    }

    if (messageType === 'new-podcast' || messageType === 'new-video-channel') {
      const podcastId = itemIdText ?? channelIdText;
      if (podcastId !== null) {
        return withWebPath(
          {
            channelIdText: podcastId,
            itemIdText: itemIdText,
            kind: messageType === 'new-video-channel' ? 'channel' : 'podcast',
            mobileStackPath: buildMobileHomeScopedPath(APP_ROUTES.PODCAST, podcastId),
          },
          messageType,
          mediumId,
          messageType === 'new-video-channel'
            ? buildChannelPath(podcastId)
            : buildPodcastPath(podcastId)
        );
      }
    }

    if (messageType === 'new-track') {
      if (itemIdText !== null && channelIdText !== null) {
        return withWebPath(
          {
            channelIdText,
            itemIdText,
            kind: 'track',
            mobileStackPath: buildMobileHomeAlbumTrackPath(channelIdText, itemIdText),
          },
          messageType,
          mediumId,
          buildTrackPath(itemIdText)
        );
      }
      if (itemIdText !== null) {
        return withWebPath(
          {
            channelIdText: null,
            itemIdText,
            kind: 'track',
            mobileStackPath: buildMobileHomeScopedPath(APP_ROUTES.TRACK, itemIdText),
          },
          messageType,
          mediumId,
          buildTrackPath(itemIdText)
        );
      }
    }

    if (messageType === 'new-album' && itemIdText !== null) {
      return withWebPath(
        {
          channelIdText: channelIdText,
          itemIdText,
          kind: 'album',
          mobileStackPath: buildMobileHomeScopedPath(APP_ROUTES.ALBUM, itemIdText),
        },
        messageType,
        mediumId,
        buildAlbumPath(itemIdText)
      );
    }
  }

  if (messageType !== null && isResourceTypeKey(messageType) && itemIdText !== null) {
    const resource = RESOURCE_TYPE_DESTINATIONS[messageType];
    return {
      channelIdText,
      itemIdText,
      kind: resource.kind,
      mobileStackPath:
        resource.mobileRoute === null
          ? null
          : buildMobileHomeScopedPath(resource.mobileRoute, itemIdText),
      webPath: buildAppRoutePath(resource.webRoute, itemIdText),
    };
  }

  if (linkPath !== null) {
    return {
      channelIdText,
      itemIdText,
      kind: 'path',
      mobileStackPath: null,
      webPath: linkPath,
    };
  }

  return HOME_DESTINATION;
};

/**
 * Resolve a destination from an in-app row payload or a push data bag. Accepts the field names
 * senders actually use (`type` / `itemIdText` / `channelIdText` / `link` / `link_path`).
 */
export const resolveNotificationDestinationFromPayload = (
  data: Record<string, unknown> | null | undefined
): NotificationDestination => {
  if (data === null || data === undefined) {
    return HOME_DESTINATION;
  }

  const messageType = asNonEmptyString(data.type) ?? asNonEmptyString(data.messageType);
  const itemIdText =
    asNonEmptyString(data.itemIdText) ??
    asNonEmptyString(data.id_text) ??
    asNonEmptyString(data.item_id_text);
  const channelIdText =
    asNonEmptyString(data.channelIdText) ??
    asNonEmptyString(data.channel_id_text) ??
    asNonEmptyString(data.podcastId);
  const linkPath =
    asNonEmptyString(data.link_path) ?? asNonEmptyString(data.link) ?? asNonEmptyString(data.url);

  return resolveNotificationDestination({
    channelIdText,
    itemIdText,
    linkPath,
    mediumId: asMediumId(data.mediumId) ?? asMediumId(data.medium_id),
    messageType,
  });
};
