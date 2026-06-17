import type { CSSProperties } from 'react';

import { getEmbedIframeHeightForPlayerSize } from './buildEmbedIframeCode';
import type { EmbedAspectRatioQuery } from './embedAspectRatio';
import { embedAspectRatioToCssValue } from './embedAspectRatio';
import { getEmbedListVideoPlaceholderHeightPx } from './embedLayoutDimensions';
import type { EmbedLayoutType, EmbedPlayerSizeQuery } from './embedTypes';

type BuildEmbedBuilderPreviewFrameStyleInput = {
  layout: EmbedLayoutType;
  playerSize: EmbedPlayerSizeQuery;
  listEnabled: boolean;
  listVisibleRows: number;
  aspectRatio: EmbedAspectRatioQuery;
};

export function buildEmbedBuilderPreviewFrameStyle(
  input: BuildEmbedBuilderPreviewFrameStyleInput
): CSSProperties {
  const isResponsiveSingle = !input.listEnabled && input.playerSize === 'responsive';

  if (input.layout === 'list') {
    const placeholderHeightPx = getEmbedListVideoPlaceholderHeightPx(input.aspectRatio);

    return {
      height: `${getEmbedIframeHeightForPlayerSize(input.layout, input.playerSize, {
        listVisibleRows: input.listVisibleRows,
        aspectRatio: input.aspectRatio,
        includePresentationSelector: false,
      })}px`,
      '--embed-list-visible-rows': String(input.listVisibleRows),
      '--embed-list-video-placeholder-height': `${placeholderHeightPx}px`,
      '--embed-has-presentation-selector': 0,
    } as CSSProperties;
  }

  if (isResponsiveSingle) {
    return {
      '--embed-video-aspect-ratio': embedAspectRatioToCssValue(input.aspectRatio),
    } as CSSProperties;
  }

  return {};
}
