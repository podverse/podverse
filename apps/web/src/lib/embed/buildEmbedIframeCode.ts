import {
  DEFAULT_LIST_AUDIO_IFRAME_HEIGHT,
  DEFAULT_LIST_IFRAME_HEIGHT,
  DEFAULT_LIST_VIDEO_IFRAME_HEIGHT,
  DEFAULT_SINGLE_AUDIO_IFRAME_HEIGHT,
  DEFAULT_SINGLE_IFRAME_HEIGHT,
  DEFAULT_SINGLE_VIDEO_IFRAME_HEIGHT,
} from './embedLayoutDimensions';
import type { EmbedLayoutType, EmbedMediaType, EmbedRouteKind } from './embedTypes';
import { getEmbedLayoutType } from './getEmbedLayoutType';

/** Permissions Policy `allow` value for Podverse embed iframes (autoplay only). */
export const EMBED_IFRAME_ALLOW = 'autoplay';

export {
  DEFAULT_LIST_AUDIO_IFRAME_HEIGHT,
  DEFAULT_LIST_IFRAME_HEIGHT,
  DEFAULT_LIST_VIDEO_IFRAME_HEIGHT,
  DEFAULT_SINGLE_AUDIO_IFRAME_HEIGHT,
  DEFAULT_SINGLE_IFRAME_HEIGHT,
  DEFAULT_SINGLE_VIDEO_IFRAME_HEIGHT,
};

export function getEmbedIframeHeightForPresentation(
  layoutType: EmbedLayoutType,
  presentationStyle: EmbedMediaType
): number {
  if (layoutType === 'list') {
    return presentationStyle === 'video'
      ? DEFAULT_LIST_VIDEO_IFRAME_HEIGHT
      : DEFAULT_LIST_AUDIO_IFRAME_HEIGHT;
  }

  return presentationStyle === 'video'
    ? DEFAULT_SINGLE_VIDEO_IFRAME_HEIGHT
    : DEFAULT_SINGLE_AUDIO_IFRAME_HEIGHT;
}

export function getEmbedIframeHeightForRouteKind(
  routeKind: EmbedRouteKind,
  presentationStyle: EmbedMediaType = 'audio'
): number {
  return getEmbedIframeHeightForPresentation(getEmbedLayoutType(routeKind), presentationStyle);
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
  const height = options?.height ?? DEFAULT_SINGLE_AUDIO_IFRAME_HEIGHT;

  return `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allow="${EMBED_IFRAME_ALLOW}" title="${title}"></iframe>`;
}
