import { describe, expect, it } from 'vitest';

import {
  getEmbedListVideoIframeHeightPx,
  getEmbedListVideoPlaceholderHeightPx,
} from '../embedLayoutDimensions';
import {
  EMBED_LIST_ROW_HEIGHT_PX,
  EMBED_PANEL_PADDING_BLOCK_PX,
  EMBED_PLAYER_ART_SIZE_PX,
  EMBED_PLAYER_INFO_CONTROLS_GAP_PX,
  EMBED_PRESENTATION_SELECTOR_HEIGHT_PX,
} from '../embedLayoutTokens';

function expectedVideoPanelHeight(placeholderHeight: number): number {
  return (
    EMBED_PANEL_PADDING_BLOCK_PX * 2 +
    EMBED_PLAYER_ART_SIZE_PX +
    EMBED_PLAYER_INFO_CONTROLS_GAP_PX +
    placeholderHeight
  );
}

describe('embedLayoutDimensions video list', () => {
  it('derives fixed list video placeholder heights from aspect ratio', () => {
    expect(getEmbedListVideoPlaceholderHeightPx('16x9')).toBe(360);
    expect(getEmbedListVideoPlaceholderHeightPx('4x3')).toBe(480);
    expect(getEmbedListVideoPlaceholderHeightPx('1x1')).toBe(640);
  });

  it('derives list video iframe heights from panel + rows', () => {
    expect(getEmbedListVideoIframeHeightPx({ aspectRatio: '16x9', listVisibleRows: 2 })).toBe(
      expectedVideoPanelHeight(360) + EMBED_LIST_ROW_HEIGHT_PX * 2
    );
    expect(getEmbedListVideoIframeHeightPx({ aspectRatio: '4x3', listVisibleRows: 5 })).toBe(
      expectedVideoPanelHeight(480) + EMBED_LIST_ROW_HEIGHT_PX * 5
    );
    expect(getEmbedListVideoIframeHeightPx({ aspectRatio: '1x1', listVisibleRows: 10 })).toBe(
      expectedVideoPanelHeight(640) + EMBED_LIST_ROW_HEIGHT_PX * 10
    );
  });

  it('adds optional presentation selector height when requested', () => {
    expect(
      getEmbedListVideoIframeHeightPx({
        aspectRatio: '16x9',
        listVisibleRows: 5,
        includePresentationSelector: true,
      })
    ).toBe(
      expectedVideoPanelHeight(360) +
        EMBED_LIST_ROW_HEIGHT_PX * 5 +
        EMBED_PRESENTATION_SELECTOR_HEIGHT_PX
    );
  });
});
