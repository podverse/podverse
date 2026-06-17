import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LIST_COMPACT_IFRAME_HEIGHT,
  DEFAULT_SINGLE_COMPACT_IFRAME_HEIGHT,
  DEFAULT_SINGLE_RESPONSIVE_IFRAME_HEIGHT,
  EMBED_PLAYER_PANEL_COMPACT_HEIGHT_PX,
  getEmbedListCompactIframeHeightPx,
} from '../embedLayoutDimensions';
import {
  EMBED_LIST_ROW_HEIGHT_PX,
  EMBED_PANEL_PADDING_BLOCK_PX,
  EMBED_PLAY_BUTTON_SIZE_PX,
  EMBED_PLAYER_ART_SIZE_PX,
  EMBED_PLAYER_INFO_CONTROLS_GAP_PX,
  EMBED_SINGLE_VIDEO_PLACEHOLDER_PX,
} from '../embedLayoutTokens';

function expectedPanelCompactHeightPx(): number {
  return (
    EMBED_PANEL_PADDING_BLOCK_PX * 2 +
    EMBED_PLAYER_ART_SIZE_PX +
    EMBED_PLAYER_INFO_CONTROLS_GAP_PX +
    EMBED_PLAY_BUTTON_SIZE_PX
  );
}

function expectedPanelResponsiveHeightPx(placeholderHeightPx: number): number {
  return (
    EMBED_PANEL_PADDING_BLOCK_PX * 2 +
    EMBED_PLAYER_ART_SIZE_PX +
    EMBED_PLAYER_INFO_CONTROLS_GAP_PX +
    placeholderHeightPx
  );
}

describe('embedLayoutDimensions', () => {
  it('derives single compact height from panel padding, art, gap, and play button', () => {
    const expectedPanelHeight = expectedPanelCompactHeightPx();

    expect(EMBED_PLAYER_PANEL_COMPACT_HEIGHT_PX).toBe(expectedPanelHeight);
    expect(DEFAULT_SINGLE_COMPACT_IFRAME_HEIGHT).toBe(expectedPanelHeight);
  });

  it('derives single responsive height from the single video placeholder', () => {
    const expectedPanelHeight = expectedPanelResponsiveHeightPx(EMBED_SINGLE_VIDEO_PLACEHOLDER_PX);

    expect(DEFAULT_SINGLE_RESPONSIVE_IFRAME_HEIGHT).toBe(expectedPanelHeight);
  });

  it('derives list shell heights from the player panel plus list viewport', () => {
    const expectedPanelCompactHeight = expectedPanelCompactHeightPx();

    expect(DEFAULT_LIST_COMPACT_IFRAME_HEIGHT).toBe(
      expectedPanelCompactHeight + EMBED_LIST_ROW_HEIGHT_PX * 5
    );
    expect(getEmbedListCompactIframeHeightPx({ listVisibleRows: 10 })).toBe(
      expectedPanelCompactHeight + EMBED_LIST_ROW_HEIGHT_PX * 10
    );
  });
});
