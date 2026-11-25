import type { EmbedRouteKind } from './embedTypes';

/** Album and track demo cards. Other embed demos stay when Music is off. */
export function embedDemoRouteOffered(routeKind: EmbedRouteKind, musicEnabled: boolean): boolean {
  if (musicEnabled) {
    return true;
  }
  return routeKind !== 'album' && routeKind !== 'track';
}
