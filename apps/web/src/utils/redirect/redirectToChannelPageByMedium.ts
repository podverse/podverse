import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { redirect } from 'next/navigation';

import type { DTOChannel } from '@podverse/helpers';
import { getItemTypeFromMedium, isAlbumMediumId, isArtistMediumId } from '@podverse/helpers';

import { ROUTES } from '../../constants/routes';

export type ChannelRouteKind = 'podcast' | 'album' | 'artist';

const CHANNEL_ROUTE_KIND_BASE: Record<ChannelRouteKind, string> = {
  podcast: ROUTES.PODCAST,
  album: ROUTES.ALBUM,
  artist: ROUTES.ARTIST,
};

/**
 * Canonical channel route kind for a medium. Podcast/video family, unmapped
 * mediums (audiobook, film, etc.), and null/undefined default to 'podcast'.
 */
export const getChannelRouteKind = (medium_id: number | null | undefined): ChannelRouteKind => {
  if (isArtistMediumId(medium_id)) {
    return 'artist';
  }
  if (isAlbumMediumId(medium_id)) {
    return 'album';
  }
  return 'podcast';
};

/** Canonical channel page path for a medium (always non-null). */
export const getChannelPathByMedium = (medium_id: number, channel_id_text: string) => {
  return `${CHANNEL_ROUTE_KIND_BASE[getChannelRouteKind(medium_id)]}/${channel_id_text}`;
};

/** Canonical channel page path for a channel (always non-null). */
export const getChannelPath = (channel: DTOChannel) => {
  return getChannelPathByMedium(channel.medium_id, channel.id_text);
};

/** Canonical item page path (episode vs track) for a channel medium. */
export const getItemPathByMedium = (medium_id: number | null | undefined, item_id_text: string) => {
  const base = getItemTypeFromMedium(medium_id) === 'track' ? ROUTES.TRACK : ROUTES.EPISODE;
  return `${base}/${item_id_text}`;
};

export const redirectToChannelPageByMediumServer = (medium_id: number, channel_id_text: string) => {
  redirect(getChannelPathByMedium(medium_id, channel_id_text));
};

export const redirectToChannelPageByMediumClient = (router: AppRouterInstance) => {
  return (medium_id: number, channel_id_text: string) => {
    router.push(getChannelPathByMedium(medium_id, channel_id_text));
  };
};
