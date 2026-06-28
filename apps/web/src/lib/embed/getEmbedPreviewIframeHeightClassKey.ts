import type { EmbedLayoutType, EmbedPlayerSizeQuery } from './embedTypes';

export type EmbedPreviewIframeHeightClassKey =
  'iframeSingleCompact' | 'iframeSingleResponsive' | 'iframeListCompact' | 'iframeListResponsive';

export function getEmbedPreviewIframeHeightClassKey(
  layoutType: EmbedLayoutType,
  playerSize: EmbedPlayerSizeQuery
): EmbedPreviewIframeHeightClassKey {
  const isResponsive = playerSize === 'responsive';

  if (layoutType === 'list') {
    return isResponsive ? 'iframeListResponsive' : 'iframeListCompact';
  }

  return isResponsive ? 'iframeSingleResponsive' : 'iframeSingleCompact';
}
