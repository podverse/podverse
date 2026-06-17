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
  DEFAULT_SINGLE_COMPACT_IFRAME_HEIGHT,
  DEFAULT_SINGLE_RESPONSIVE_IFRAME_HEIGHT,
  getEmbedListCompactIframeHeightPx,
  getEmbedListResponsiveIframeHeightPx,
} from './embedLayoutDimensions';
import type {
  EmbedLayoutType,
  EmbedMediaType,
  EmbedPlayerSizeQuery,
  EmbedRouteKind,
} from './embedTypes';
import { formatEmbedIframeElement, formatHtmlElement } from './formatEmbedHtmlCode';
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
  DEFAULT_LIST_COMPACT_IFRAME_HEIGHT,
  DEFAULT_LIST_RESPONSIVE_IFRAME_HEIGHT,
  DEFAULT_SINGLE_COMPACT_IFRAME_HEIGHT,
  DEFAULT_SINGLE_RESPONSIVE_IFRAME_HEIGHT,
} from './embedLayoutDimensions';

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
    return playerSize === 'responsive'
      ? getEmbedListResponsiveIframeHeightPx({
          listVisibleRows: options?.listVisibleRows,
          aspectRatio: options?.aspectRatio,
          includePresentationSelector: options?.includePresentationSelector,
        })
      : getEmbedListCompactIframeHeightPx({
          listVisibleRows: options?.listVisibleRows,
          includePresentationSelector: options?.includePresentationSelector,
        });
  }

  return playerSize === 'responsive'
    ? DEFAULT_SINGLE_RESPONSIVE_IFRAME_HEIGHT
    : DEFAULT_SINGLE_COMPACT_IFRAME_HEIGHT;
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
    presentationStyle === 'video' ? 'responsive' : 'compact',
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
    borderColor?: string;
  }
): string {
  const title = options?.title ?? 'Embed player';
  const width = options?.width ?? '100%';
  const height = options?.height ?? DEFAULT_SINGLE_COMPACT_IFRAME_HEIGHT;
  const layout = options?.layout ?? 'single';
  const playerSize =
    options?.playerSize ?? (options?.presentation === 'video' ? 'responsive' : 'compact');
  const aspectRatio = options?.aspectRatio ?? DEFAULT_EMBED_ASPECT_RATIO;
  const borderValue = buildEmbedBorderStyleValue(
    options?.borderColor ?? DEFAULT_EMBED_BORDER_COLOR
  );
  // Border-box keeps the 1px border inside the declared iframe box so the embed
  // height stays exact. Omit both entirely when the user chose "none".
  const borderDeclaration =
    borderValue !== null ? `box-sizing:border-box;border:${borderValue};` : '';

  if (layout === 'single' && playerSize === 'responsive') {
    const paddingBottomPercent = embedAspectRatioToPaddingBottomPercent(aspectRatio);
    const wrapperWidth = formatCssWidth(width);
    const iframeBorderStyle =
      borderDeclaration !== '' ? borderDeclaration.slice(0, -1) : undefined;

    const iframeHtml = formatEmbedIframeElement(embedUrl, {
      title,
      borderStyleAttribute:
        iframeBorderStyle !== undefined
          ? `position:absolute;inset:0;width:100%;height:100%;${iframeBorderStyle}`
          : 'position:absolute;inset:0;width:100%;height:100%;',
    });

    return formatHtmlElement(
      'div',
      [
        {
          name: 'style',
          value: `position:relative;width:${wrapperWidth};padding-bottom:${paddingBottomPercent}%;height:0;overflow:hidden;`,
        },
      ],
      iframeHtml
    );
  }

  const borderStyleAttribute =
    borderDeclaration !== '' ? borderDeclaration.slice(0, -1) : undefined;

  return formatEmbedIframeElement(embedUrl, {
    title,
    width,
    height,
    borderStyleAttribute,
  });
}

function formatCssWidth(width: number | string): string {
  if (typeof width === 'number') {
    return `${width}px`;
  }

  return width;
}
