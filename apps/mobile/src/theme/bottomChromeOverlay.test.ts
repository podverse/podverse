import { describe, expect, it } from 'vitest';

import { getThemeTokens } from '@podverse/design-tokens';

import {
  bottomChromeStripOverlayHeight,
  centeredFillClearanceShift,
  globalActivityBarLayout,
  miniPlayerOverlayHeight,
} from './bottomChromeOverlay';
import { bottomChromeStripHeight } from './bottomChromeStrip';
import { MINI_PLAYER_ARTWORK_SIZE, MINI_PLAYER_PROGRESS_EDGE_HEIGHT } from './screenLayout';

const spacing = getThemeTokens('dark').spacing;
const borderTopWidth = 1;

describe('globalActivityBarLayout', () => {
  const rowHeight = bottomChromeStripHeight(spacing);

  it('is zero when neither sync nor downloads are showing', () => {
    expect(
      globalActivityBarLayout({
        borderTopWidth,
        downloadsVisible: false,
        spacing,
        syncVisible: false,
      }).overlayHeight
    ).toBe(0);
  });

  it('adds the sync row under its top padding and the bar border', () => {
    expect(
      globalActivityBarLayout({
        borderTopWidth,
        downloadsVisible: false,
        spacing,
        syncVisible: true,
      }).overlayHeight
    ).toBe(borderTopWidth + spacing.sm + rowHeight);
  });

  it('uses only the row for downloads, then a gap when sync is also showing', () => {
    expect(
      globalActivityBarLayout({
        borderTopWidth,
        downloadsVisible: true,
        spacing,
        syncVisible: false,
      }).overlayHeight
    ).toBe(borderTopWidth + rowHeight);

    expect(
      globalActivityBarLayout({
        borderTopWidth,
        downloadsVisible: true,
        spacing,
        syncVisible: true,
      }).overlayHeight
    ).toBe(borderTopWidth + spacing.sm + rowHeight + spacing.sm + rowHeight);
  });
});

describe('bottom chrome overlay height', () => {
  it('sums the visible strips and leaves out the hidden ones', () => {
    const activity = globalActivityBarLayout({
      borderTopWidth,
      downloadsVisible: false,
      spacing,
      syncVisible: true,
    }).overlayHeight;
    const offline = bottomChromeStripOverlayHeight(true, spacing);
    const segment = bottomChromeStripOverlayHeight(false, spacing);
    const membership = bottomChromeStripOverlayHeight(true, spacing);
    const miniPlayer = miniPlayerOverlayHeight(true);

    expect(segment).toBe(0);
    expect(offline).toBe(bottomChromeStripHeight(spacing));
    expect(membership).toBe(bottomChromeStripHeight(spacing));
    expect(miniPlayer).toBe(MINI_PLAYER_ARTWORK_SIZE + MINI_PLAYER_PROGRESS_EDGE_HEIGHT);
    expect(activity + offline + segment + membership + miniPlayer).toBe(
      activity +
        bottomChromeStripHeight(spacing) +
        bottomChromeStripHeight(spacing) +
        MINI_PLAYER_ARTWORK_SIZE +
        MINI_PLAYER_PROGRESS_EDGE_HEIGHT
    );
  });
});

describe('centeredFillClearanceShift', () => {
  it('stays put when the centered block already clears the overlay', () => {
    // Space under a 100-tall block in a 400-tall parent is 150, more than a 40 overlay.
    expect(centeredFillClearanceShift(400, 100, 40)).toBe(0);
    expect(centeredFillClearanceShift(400, 300, 50)).toBe(0);
  });

  it('moves up by only the covered amount', () => {
    // Space under a 300-tall block in a 400-tall parent is 50. An 80 overlay covers 30.
    expect(centeredFillClearanceShift(400, 300, 80)).toBe(30);
  });

  it('does not shift before either box has been measured', () => {
    expect(centeredFillClearanceShift(0, 100, 40)).toBe(0);
    expect(centeredFillClearanceShift(400, 0, 40)).toBe(0);
    expect(centeredFillClearanceShift(400, 100, 0)).toBe(0);
  });
});
