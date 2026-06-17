import { describe, expect, it } from 'vitest';

import { buildEmbedBuilderPreviewFrameStyle } from '../buildEmbedBuilderPreviewFrameStyle';
import { getEmbedIframeHeightForPlayerSize } from '../buildEmbedIframeCode';
import { getEmbedListVideoPlaceholderHeightPx } from '../embedLayoutDimensions';

describe('buildEmbedBuilderPreviewFrameStyle', () => {
  it('sets explicit list shell height and row tokens for list layouts', () => {
    expect(
      buildEmbedBuilderPreviewFrameStyle({
        layout: 'list',
        playerSize: 'responsive',
        listEnabled: true,
        listVisibleRows: 8,
        aspectRatio: '4x3',
      })
    ).toEqual({
      height: `${getEmbedIframeHeightForPlayerSize('list', 'responsive', {
        listVisibleRows: 8,
        aspectRatio: '4x3',
        includePresentationSelector: false,
      })}px`,
      '--embed-list-visible-rows': '8',
      '--embed-list-video-placeholder-height': `${getEmbedListVideoPlaceholderHeightPx('4x3')}px`,
      '--embed-has-presentation-selector': 0,
    });
  });

  it('sets only aspect ratio for responsive single layouts', () => {
    expect(
      buildEmbedBuilderPreviewFrameStyle({
        layout: 'single',
        playerSize: 'responsive',
        listEnabled: false,
        listVisibleRows: 5,
        aspectRatio: '1x1',
      })
    ).toEqual({
      '--embed-video-aspect-ratio': '1 / 1',
    });
  });
});
