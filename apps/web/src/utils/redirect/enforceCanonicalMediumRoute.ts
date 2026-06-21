import { redirect } from 'next/navigation';

import type { DTOChannel } from '@podverse/helpers';
import { getItemTypeFromMedium } from '@podverse/helpers';

import { ROUTES } from '../../constants/routes';
import type { ChannelRouteKind } from './redirectToChannelPageByMedium';
import { getChannelPath, getChannelRouteKind } from './redirectToChannelPageByMedium';

/**
 * Redirect to the canonical channel page for the feed's medium when the current
 * route does not match. Keeps a music album off `/podcast`, a podcast off
 * `/album`, etc. Call after the channel is loaded and after any policy redirect.
 */
export const enforceCanonicalChannelRoute = (
  channel: DTOChannel,
  currentKind: ChannelRouteKind
): void => {
  if (getChannelRouteKind(channel.medium_id) !== currentKind) {
    redirect(getChannelPath(channel));
  }
};

/**
 * Redirect to the canonical item page for the channel's medium when the current
 * route does not match (track must not render at `/episode`, and vice versa).
 */
export const enforceCanonicalItemRoute = (
  channelMediumId: number | null | undefined,
  itemIdText: string,
  currentKind: 'episode' | 'track'
): void => {
  if (getItemTypeFromMedium(channelMediumId) !== currentKind) {
    const base = currentKind === 'episode' ? ROUTES.TRACK : ROUTES.EPISODE;
    redirect(`${base}/${itemIdText}`);
  }
};
