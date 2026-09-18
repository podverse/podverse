import { APP_ROUTES, buildAppRoutePath } from '@podverse/helpers';
import type { PlaybackTarget } from '@podverse/playback-core';

export type ShareResource =
  | 'album'
  | 'artist'
  | 'clip'
  | 'episode'
  | 'playlist'
  | 'podcast'
  | 'profile'
  | 'track';

const SHARE_RESOURCE_ROUTES: Record<ShareResource, (typeof APP_ROUTES)[keyof typeof APP_ROUTES]> = {
  album: APP_ROUTES.ALBUM,
  artist: APP_ROUTES.ARTIST,
  clip: APP_ROUTES.CLIP,
  episode: APP_ROUTES.EPISODE,
  playlist: APP_ROUTES.PLAYLIST,
  podcast: APP_ROUTES.PODCAST,
  profile: APP_ROUTES.PROFILE,
  track: APP_ROUTES.TRACK,
};

const trimTrailingSlashes = (value: string): string => {
  return value.replace(/\/+$/, '');
};

export const buildPublicShareUrl = (
  webBaseUrl: string,
  resource: ShareResource,
  idText: string
): string => {
  return `${trimTrailingSlashes(webBaseUrl)}${buildAppRoutePath(SHARE_RESOURCE_ROUTES[resource], idText)}`;
};

export function buildNowPlayingShareUrl(webBaseUrl: string, target: PlaybackTarget): string | null {
  switch (target.kind) {
    case 'clip':
      return buildPublicShareUrl(webBaseUrl, 'clip', target.clip.id_text);
    case 'soundbite':
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      return buildPublicShareUrl(webBaseUrl, 'episode', target.item.id_text);
    case 'livestream':
      return buildPublicShareUrl(webBaseUrl, 'podcast', target.channel.id_text);
    case 'add-by-rss':
      return null;
  }
}
