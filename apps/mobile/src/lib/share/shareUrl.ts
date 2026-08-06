import type { PlaybackTarget } from '@podverse/playback-core';

export type ShareResource = 'clip' | 'episode' | 'playlist' | 'podcast' | 'profile';

const trimTrailingSlashes = (value: string): string => {
  return value.replace(/\/+$/, '');
};

export const buildPublicShareUrl = (
  webBaseUrl: string,
  resource: ShareResource,
  idText: string
): string => {
  return `${trimTrailingSlashes(webBaseUrl)}/${resource}/${idText}`;
};

export function buildNowPlayingShareUrl(
  webBaseUrl: string,
  target: PlaybackTarget
): string | null {
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
