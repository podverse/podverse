import type { EmbedRouteKind } from './embedTypes';
import { getEmbedLayoutType } from './getEmbedLayoutType';

export const DEFAULT_SINGLE_IFRAME_HEIGHT = 260;
export const DEFAULT_LIST_IFRAME_HEIGHT = 720;

export function getEmbedIframeHeightForRouteKind(routeKind: EmbedRouteKind): number {
  return getEmbedLayoutType(routeKind) === 'list'
    ? DEFAULT_LIST_IFRAME_HEIGHT
    : DEFAULT_SINGLE_IFRAME_HEIGHT;
}

export function buildEmbedIframeCode(
  embedUrl: string,
  options?: {
    title?: string;
    width?: number | string;
    height?: number | string;
  }
): string {
  const title = options?.title ?? 'Podverse embed';
  const width = options?.width ?? '100%';
  const height = options?.height ?? DEFAULT_SINGLE_IFRAME_HEIGHT;

  return `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allow="autoplay; encrypted-media" title="${title}"></iframe>`;
}
