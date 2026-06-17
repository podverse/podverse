import {
  DEFAULT_EMBED_ASPECT_RATIO,
  type EmbedAspectRatioQuery,
  embedAspectRatioToValue,
} from './embedAspectRatio';
import {
  EMBED_LIST_ROW_HEIGHT_PX,
  EMBED_LIST_VIDEO_REFERENCE_WIDTH_PX,
  EMBED_PANEL_PADDING_BLOCK_PX,
  EMBED_PLAY_BUTTON_SIZE_PX,
  EMBED_PLAYER_ART_SIZE_PX,
  EMBED_PLAYER_INFO_CONTROLS_GAP_PX,
  EMBED_PRESENTATION_SELECTOR_HEIGHT_PX,
  EMBED_SINGLE_VIDEO_PLACEHOLDER_PX,
} from './embedLayoutTokens';
import { EMBED_LIST_VISIBLE_ROWS_DEFAULT } from './parseEmbedListRows';

/**
 * Default embed iframe heights at 16px root.
 * Formulas mirror apps/web/src/styles/components/embed/_embedLayoutTokens.scss.
 */
function embedPlayerPanelCompactHeightPx(): number {
  return (
    EMBED_PANEL_PADDING_BLOCK_PX * 2 +
    EMBED_PLAYER_ART_SIZE_PX +
    EMBED_PLAYER_INFO_CONTROLS_GAP_PX +
    EMBED_PLAY_BUTTON_SIZE_PX
  );
}

function embedPlayerPanelResponsiveHeightPx(placeholderHeightPx: number): number {
  return (
    EMBED_PANEL_PADDING_BLOCK_PX * 2 +
    EMBED_PLAYER_ART_SIZE_PX +
    EMBED_PLAYER_INFO_CONTROLS_GAP_PX +
    placeholderHeightPx
  );
}

function embedPlayerPanelResponsiveListHeightPx(placeholderHeightPx: number): number {
  return placeholderHeightPx;
}

function embedListRegionHeightPx(listVisibleRows: number): number {
  return listVisibleRows * EMBED_LIST_ROW_HEIGHT_PX;
}

function embedPresentationSelectorHeightPx(includePresentationSelector: boolean): number {
  return includePresentationSelector ? EMBED_PRESENTATION_SELECTOR_HEIGHT_PX : 0;
}

function embedListVideoPlaceholderHeightPx(aspectRatio: EmbedAspectRatioQuery): number {
  const aspectRatioValue = embedAspectRatioToValue(aspectRatio);
  return Math.round(EMBED_LIST_VIDEO_REFERENCE_WIDTH_PX / aspectRatioValue);
}

export const EMBED_PLAYER_PANEL_COMPACT_HEIGHT_PX = embedPlayerPanelCompactHeightPx();

export const DEFAULT_SINGLE_COMPACT_IFRAME_HEIGHT = EMBED_PLAYER_PANEL_COMPACT_HEIGHT_PX;

export const DEFAULT_SINGLE_RESPONSIVE_IFRAME_HEIGHT = embedPlayerPanelResponsiveHeightPx(
  EMBED_SINGLE_VIDEO_PLACEHOLDER_PX
);

export function getEmbedListCompactIframeHeightPx(options?: {
  listVisibleRows?: number;
  includePresentationSelector?: boolean;
}): number {
  const listVisibleRows = options?.listVisibleRows ?? EMBED_LIST_VISIBLE_ROWS_DEFAULT;
  const includePresentationSelector = options?.includePresentationSelector ?? false;

  return (
    EMBED_PLAYER_PANEL_COMPACT_HEIGHT_PX +
    embedListRegionHeightPx(listVisibleRows) +
    embedPresentationSelectorHeightPx(includePresentationSelector)
  );
}

export function getEmbedListResponsiveIframeHeightPx(options?: {
  listVisibleRows?: number;
  aspectRatio?: EmbedAspectRatioQuery;
  includePresentationSelector?: boolean;
}): number {
  const listVisibleRows = options?.listVisibleRows ?? EMBED_LIST_VISIBLE_ROWS_DEFAULT;
  const aspectRatio = options?.aspectRatio ?? DEFAULT_EMBED_ASPECT_RATIO;
  const includePresentationSelector = options?.includePresentationSelector ?? false;
  const panelHeight = embedPlayerPanelResponsiveListHeightPx(
    embedListVideoPlaceholderHeightPx(aspectRatio)
  );

  return (
    panelHeight +
    embedListRegionHeightPx(listVisibleRows) +
    embedPresentationSelectorHeightPx(includePresentationSelector)
  );
}

export function getEmbedListVideoPlaceholderHeightPx(
  aspectRatio: EmbedAspectRatioQuery = DEFAULT_EMBED_ASPECT_RATIO
): number {
  return embedListVideoPlaceholderHeightPx(aspectRatio);
}

export const DEFAULT_LIST_COMPACT_IFRAME_HEIGHT = getEmbedListCompactIframeHeightPx();

export const DEFAULT_LIST_RESPONSIVE_IFRAME_HEIGHT = getEmbedListResponsiveIframeHeightPx();
