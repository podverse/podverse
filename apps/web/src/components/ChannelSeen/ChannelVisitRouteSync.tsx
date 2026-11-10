'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { APP_ROUTES } from '@podverse/helpers';

import { ROUTES } from '../../constants/routes';
import { endChannelVisit } from '../../lib/channelVisit/channelVisitStore';

const DETAIL_PREFIXES = [
  APP_ROUTES.PODCAST,
  APP_ROUTES.EPISODE,
  APP_ROUTES.ALBUM,
  APP_ROUTES.ARTIST,
  APP_ROUTES.TRACK,
  APP_ROUTES.VIDEO,
  APP_ROUTES.PODCAST_LIVESTREAM,
  APP_ROUTES.MUSIC_LIVESTREAM,
  `${ROUTES.ADD_BY_RSS}/podcast`,
  `${ROUTES.ADD_BY_RSS}/episode`,
  `${ROUTES.ADD_BY_RSS}/album`,
  `${ROUTES.ADD_BY_RSS}/artist`,
  `${ROUTES.ADD_BY_RSS}/track`,
  `${ROUTES.ADD_BY_RSS}/music`,
] as const;

const isChannelVisitPath = (pathname: string | null): boolean => {
  if (pathname === null || pathname === '') {
    return false;
  }
  return DETAIL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
};

/**
 * Ends the active channel visit when the user leaves channel or item detail routes.
 *
 * Returning to the subscription list (or any other surface) clears the visit so the next open
 * remount-marks and shows no leftover episode dots.
 */
export function ChannelVisitRouteSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (isChannelVisitPath(pathname)) {
      return;
    }
    endChannelVisit();
  }, [pathname]);

  return null;
}
