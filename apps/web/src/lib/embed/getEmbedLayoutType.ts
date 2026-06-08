import type { EmbedLayoutType, EmbedRouteKind } from './embedTypes';

export function getEmbedLayoutType(routeKind: EmbedRouteKind): EmbedLayoutType {
  if (routeKind === 'index') {
    return 'index';
  }

  if (routeKind === 'podcast' || routeKind === 'album' || routeKind === 'playlist') {
    return 'list';
  }

  return 'single';
}
