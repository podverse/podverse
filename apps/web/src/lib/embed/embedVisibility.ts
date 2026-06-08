import type { DTOChannel, DTOPlaylist } from '@podverse/helpers';
import { SharableStatusEnum } from '@podverse/helpers';

import type { EmbedRouteKind } from './embedTypes';

export function isPublicSharableStatus(sharableStatusId: number): boolean {
  return sharableStatusId === SharableStatusEnum.Public;
}

export function requiresPublicListVisibility(routeKind: EmbedRouteKind): boolean {
  return routeKind === 'podcast' || routeKind === 'album' || routeKind === 'playlist';
}

export function isEmbedChannelEmbeddable(channel: DTOChannel): boolean {
  if (channel.feed?.feed_policy?.public_visible === false) {
    return false;
  }

  return true;
}

export function isEmbedPlaylistEmbeddable(playlist: DTOPlaylist): boolean {
  return isPublicSharableStatus(playlist.sharable_status_id);
}
