import type { EmbedLayoutType, EmbedPlayerSizeQuery } from './embedTypes';

export type EmbedPreviewIframeHeightClassKey =
  | 'iframeSingleShort'
  | 'iframeSingleTall'
  | 'iframeListShort'
  | 'iframeListTall';

export function getEmbedPreviewIframeHeightClassKey(
  layoutType: EmbedLayoutType,
  playerSize: EmbedPlayerSizeQuery
): EmbedPreviewIframeHeightClassKey {
  const isTall = playerSize === 'tall';

  if (layoutType === 'list') {
    return isTall ? 'iframeListTall' : 'iframeListShort';
  }

  return isTall ? 'iframeSingleTall' : 'iframeSingleShort';
}
