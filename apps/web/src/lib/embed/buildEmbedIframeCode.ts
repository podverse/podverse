import type { EmbedAspectRatioQuery } from './embedAspectRatio';
import {
  DEFAULT_EMBED_ASPECT_RATIO,
  embedAspectRatioToPaddingBottomPercent,
} from './embedAspectRatio';
import {
  buildEmbedBorderStyleValue,
  DEFAULT_EMBED_BORDER_COLOR,
  EMBED_BORDER_WIDTH,
} from './embedBorderColor';
import {
  DEFAULT_LIST_SHORT_IFRAME_HEIGHT,
  DEFAULT_LIST_TALL_IFRAME_HEIGHT,
  DEFAULT_SINGLE_SHORT_IFRAME_HEIGHT,
  DEFAULT_SINGLE_TALL_IFRAME_HEIGHT,
  getEmbedListShortIframeHeightPx,
  getEmbedListTallIframeHeightPx,
} from './embedLayoutDimensions';
import type { EmbedLayoutType, EmbedMediaType, EmbedPlayerSizeQuery, EmbedRouteKind } from './embedTypes';
import { getEmbedLayoutType } from './getEmbedLayoutType';

/** Permissions Policy `allow` value for Podverse embed iframes (autoplay only). */
export const EMBED_IFRAME_ALLOW = 'autoplay';

/**
 * Default border applied by the embed copy/paste code, not by the embed content itself.
 * This lets implementers keep, edit, or remove the border via the inline style they
 * paste. The builder lets the user pick the color (or none); this is the default value.
 */
export const EMBED_IFRAME_BORDER_STYLE = `${EMBED_BORDER_WIDTH} solid ${DEFAULT_EMBED_BORDER_COLOR}`;

export {
  DEFAULT_LIST_SHORT_IFRAME_HEIGHT,
  DEFAULT_LIST_TALL_IFRAME_HEIGHT,
  DEFAULT_SINGLE_SHORT_IFRAME_HEIGHT,
  DEFAULT_SINGLE_TALL_IFRAME_HEIGHT,
};

export function getEmbedIframeHeightForPlayerSize(
  layoutType: EmbedLayoutType,
  playerSize: EmbedPlayerSizeQuery,
  options?: {
    listVisibleRows?: number;
    aspectRatio?: EmbedAspectRatioQuery;
    includePresentationSelector?: boolean;
  }
): number {
  if (layoutType === 'list') {
    return playerSize === 'tall'
      ? getEmbedListTallIframeHeightPx({
          listVisibleRows: options?.listVisibleRows,
          aspectRatio: options?.aspectRatio,
          includePresentationSelector: options?.includePresentationSelector,
        })
      : getEmbedListShortIframeHeightPx({
          listVisibleRows: options?.listVisibleRows,
          includePresentationSelector: options?.includePresentationSelector,
        });
  }

  return playerSize === 'tall'
    ? DEFAULT_SINGLE_TALL_IFRAME_HEIGHT
    : DEFAULT_SINGLE_SHORT_IFRAME_HEIGHT;
}

/** @deprecated Use getEmbedIframeHeightForPlayerSize */
export function getEmbedIframeHeightForPresentation(
  layoutType: EmbedLayoutType,
  presentationStyle: EmbedMediaType,
  options?: {
    listVisibleRows?: number;
    aspectRatio?: EmbedAspectRatioQuery;
    includePresentationSelector?: boolean;
  }
): number {
  const playerSize: EmbedPlayerSizeQuery = presentationStyle === 'video' ? 'tall' : 'short';
  return getEmbedIframeHeightForPlayerSize(layoutType, playerSize, options);
}

export function getEmbedIframeHeightForRouteKind(
  routeKind: EmbedRouteKind,
  presentationStyle: EmbedMediaType = 'audio',
  options?: {
    listVisibleRows?: number;
    aspectRatio?: EmbedAspectRatioQuery;
    includePresentationSelector?: boolean;
  }
): number {
  return getEmbedIframeHeightForPlayerSize(
    getEmbedLayoutType(routeKind),
    presentationStyle === 'video' ? 'tall' : 'short',
    options
  );
}

export function buildEmbedIframeCode(
  embedUrl: string,
  options?: {
    title?: string;
    width?: number | string;
    height?: number | string;
    layout?: EmbedLayoutType;
    playerSize?: EmbedPlayerSizeQuery;
    presentation?: EmbedMediaType;
    aspectRatio?: EmbedAspectRatioQuery;
    includeResizeDataAttribute?: boolean;
    borderColor?: string;
  }
): string {
  const title = options?.title ?? 'Podverse embed';
  const width = options?.width ?? '100%';
  const height = options?.height ?? DEFAULT_SINGLE_SHORT_IFRAME_HEIGHT;
  const layout = options?.layout ?? 'single';
  const playerSize = options?.playerSize ?? (options?.presentation === 'video' ? 'tall' : 'short');
  const aspectRatio = options?.aspectRatio ?? DEFAULT_EMBED_ASPECT_RATIO;
  const resizeDataAttribute = options?.includeResizeDataAttribute
    ? ' data-podverse-embed-resize'
    : '';
  const borderValue = buildEmbedBorderStyleValue(
    options?.borderColor ?? DEFAULT_EMBED_BORDER_COLOR
  );
  // Border-box keeps the 1px border inside the declared iframe box so the embed
  // height stays exact. Omit both entirely when the user chose "none".
  const borderDeclaration =
    borderValue !== null ? `box-sizing:border-box;border:${borderValue};` : '';

  if (layout === 'single' && playerSize === 'tall') {
    const paddingBottomPercent = embedAspectRatioToPaddingBottomPercent(aspectRatio);
    const wrapperWidth = formatCssWidth(width);

    return `<div style="position:relative;width:${wrapperWidth};padding-bottom:${paddingBottomPercent}%;height:0;overflow:hidden;"><iframe src="${embedUrl}" style="position:absolute;inset:0;width:100%;height:100%;${borderDeclaration}" frameborder="0" allow="${EMBED_IFRAME_ALLOW}" title="${title}"${resizeDataAttribute}></iframe></div>`;
  }

  const borderStyleAttribute = borderDeclaration !== '' ? ` style="${borderDeclaration}"` : '';

  return `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allow="${EMBED_IFRAME_ALLOW}" title="${title}"${borderStyleAttribute}${resizeDataAttribute}></iframe>`;
}

function formatCssWidth(width: number | string): string {
  if (typeof width === 'number') {
    return `${width}px`;
  }

  return width;
}
