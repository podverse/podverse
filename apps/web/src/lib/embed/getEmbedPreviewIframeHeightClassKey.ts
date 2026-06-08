import type { EmbedLayoutType, EmbedMediaType } from './embedTypes';

export type EmbedPreviewIframeHeightClassKey =
  | 'iframeSingleAudio'
  | 'iframeSingleVideo'
  | 'iframeListAudio'
  | 'iframeListVideo';

export function getEmbedPreviewIframeHeightClassKey(
  layoutType: EmbedLayoutType,
  presentationStyle: EmbedMediaType
): EmbedPreviewIframeHeightClassKey {
  const isVideo = presentationStyle === 'video';

  if (layoutType === 'list') {
    return isVideo ? 'iframeListVideo' : 'iframeListAudio';
  }

  return isVideo ? 'iframeSingleVideo' : 'iframeSingleAudio';
}
