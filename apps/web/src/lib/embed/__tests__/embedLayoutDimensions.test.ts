import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LIST_AUDIO_IFRAME_HEIGHT,
  DEFAULT_LIST_VIDEO_IFRAME_HEIGHT,
  DEFAULT_SINGLE_AUDIO_IFRAME_HEIGHT,
  DEFAULT_SINGLE_VIDEO_IFRAME_HEIGHT,
  EMBED_PLAYER_PANEL_AUDIO_HEIGHT_PX,
} from '../embedLayoutDimensions';
import {
  EMBED_LIST_REGION_AUDIO_PX,
  EMBED_LIST_REGION_VIDEO_PX,
  EMBED_LIST_VIDEO_PLACEHOLDER_PX,
  EMBED_PANEL_PADDING_BLOCK_PX,
  EMBED_PANEL_SECTION_GAP_PX,
  EMBED_PLAY_BUTTON_SIZE_PX,
  EMBED_PLAYER_ART_SIZE_PX,
  EMBED_SINGLE_VIDEO_PLACEHOLDER_PX,
} from '../embedLayoutTokens';

function expectedPanelAudioHeightPx(): number {
  return (
    EMBED_PANEL_PADDING_BLOCK_PX * 2 +
    EMBED_PLAYER_ART_SIZE_PX +
    EMBED_PANEL_SECTION_GAP_PX +
    EMBED_PLAY_BUTTON_SIZE_PX
  );
}

function expectedPanelVideoHeightPx(placeholderHeightPx: number): number {
  return (
    EMBED_PANEL_PADDING_BLOCK_PX * 2 +
    EMBED_PLAYER_ART_SIZE_PX +
    EMBED_PANEL_SECTION_GAP_PX +
    placeholderHeightPx
  );
}

describe('embedLayoutDimensions', () => {
  it('derives single-audio height from panel padding, art, gap, and play button', () => {
    const expectedPanelHeight = expectedPanelAudioHeightPx();

    expect(EMBED_PLAYER_PANEL_AUDIO_HEIGHT_PX).toBe(expectedPanelHeight);
    expect(DEFAULT_SINGLE_AUDIO_IFRAME_HEIGHT).toBe(expectedPanelHeight);
  });

  it('derives single-video height from the single video placeholder', () => {
    const expectedPanelHeight = expectedPanelVideoHeightPx(EMBED_SINGLE_VIDEO_PLACEHOLDER_PX);

    expect(DEFAULT_SINGLE_VIDEO_IFRAME_HEIGHT).toBe(expectedPanelHeight);
  });

  it('derives list shell heights from the player panel plus list viewport', () => {
    const expectedPanelAudioHeight = expectedPanelAudioHeightPx();
    const expectedPanelVideoHeight = expectedPanelVideoHeightPx(EMBED_LIST_VIDEO_PLACEHOLDER_PX);

    expect(DEFAULT_LIST_AUDIO_IFRAME_HEIGHT).toBe(
      expectedPanelAudioHeight + EMBED_LIST_REGION_AUDIO_PX
    );
    expect(DEFAULT_LIST_VIDEO_IFRAME_HEIGHT).toBe(
      expectedPanelVideoHeight + EMBED_LIST_REGION_VIDEO_PX
    );
  });
});
