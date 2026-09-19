import { describe, expect, it } from 'vitest';

import {
  FULL_PLAYER_ARTWORK_MAX_PHONE,
  FULL_PLAYER_ARTWORK_MAX_TABLET,
  FULL_PLAYER_CHIP_HEADER_HEIGHT,
  FULL_PLAYER_CONTROL_STACK_GAP,
  FULL_PLAYER_CONTROL_STACK_GAP_COUNT,
  FULL_PLAYER_PROGRESS_BLOCK_HEIGHT,
  FULL_PLAYER_REGION_BOTTOM_PADDING,
  FULL_PLAYER_REGION_GAP,
  FULL_PLAYER_REGION_GAP_COUNT,
  FULL_PLAYER_REGION_TOP_PADDING,
  FULL_PLAYER_SEGMENT_BAND_HEIGHT,
  FULL_PLAYER_TITLE_BLOCK_HEIGHT,
  FULL_PLAYER_TRANSPORT_ROW_HEIGHT,
  FULL_PLAYER_UTILITY_ROW_HEIGHT,
  resolveFullPlayerLayout,
} from './fullPlayerLayout';

const phoneInput = {
  hasSections: true,
  isTablet: false,
  maxContentWidth: 420,
  safeAreaBottom: 34,
  safeAreaTop: 47,
  viewportHeight: 844,
  viewportWidth: 390,
};

describe('full player band constants', () => {
  it('merges title and channel into one band with default and control-stack seams', () => {
    expect(FULL_PLAYER_TITLE_BLOCK_HEIGHT).toBe(48);
    expect(FULL_PLAYER_REGION_GAP_COUNT).toBe(3);
    expect(FULL_PLAYER_CONTROL_STACK_GAP_COUNT).toBe(2);
    expect(FULL_PLAYER_CONTROL_STACK_GAP).toBe(8);
    expect(FULL_PLAYER_PROGRESS_BLOCK_HEIGHT).toBe(52);
  });
});

describe('resolveFullPlayerLayout', () => {
  it('returns a positive player region and artwork under the phone cap', () => {
    const layout = resolveFullPlayerLayout(phoneInput);
    expect(layout.playerRegionHeight).toBeGreaterThan(0);
    expect(layout.viewerHeight).toBeGreaterThan(0);
    expect(layout.artworkSize).toBeGreaterThan(0);
    expect(layout.artworkSize).toBeLessThanOrEqual(FULL_PLAYER_ARTWORK_MAX_PHONE);
  });

  it('reserves the segment band and control-stack gaps whether or not a chapter is playing', () => {
    const layout = resolveFullPlayerLayout(phoneInput);
    const reservedChrome =
      FULL_PLAYER_REGION_TOP_PADDING +
      FULL_PLAYER_REGION_BOTTOM_PADDING +
      FULL_PLAYER_SEGMENT_BAND_HEIGHT +
      FULL_PLAYER_TITLE_BLOCK_HEIGHT +
      FULL_PLAYER_PROGRESS_BLOCK_HEIGHT +
      FULL_PLAYER_TRANSPORT_ROW_HEIGHT +
      FULL_PLAYER_UTILITY_ROW_HEIGHT +
      FULL_PLAYER_REGION_GAP * FULL_PLAYER_REGION_GAP_COUNT +
      FULL_PLAYER_CONTROL_STACK_GAP * FULL_PLAYER_CONTROL_STACK_GAP_COUNT;
    expect(layout.playerRegionHeight - layout.viewerHeight).toBe(reservedChrome);
  });

  it('caps artwork at the tablet cap on tall layouts', () => {
    const layout = resolveFullPlayerLayout({
      ...phoneInput,
      isTablet: true,
      maxContentWidth: 980,
      safeAreaBottom: 20,
      safeAreaTop: 24,
      viewportHeight: 1400,
      viewportWidth: 1280,
    });
    expect(layout.artworkSize).toBe(FULL_PLAYER_ARTWORK_MAX_TABLET);
  });

  it('gives up artwork rather than the chip strip on short viewports', () => {
    const layout = resolveFullPlayerLayout({
      ...phoneInput,
      maxContentWidth: 480,
      safeAreaBottom: 0,
      safeAreaTop: 0,
      viewportHeight: 280,
      viewportWidth: 480,
    });
    expect(layout.peekHeight).toBe(FULL_PLAYER_CHIP_HEADER_HEIGHT);
    expect(layout.playerRegionHeight).toBe(280 - FULL_PLAYER_CHIP_HEADER_HEIGHT);
    expect(layout.artworkSize).toBeLessThan(resolveFullPlayerLayout(phoneInput).artworkSize);
  });

  it('peeks the chip strip plus the bottom safe area so pane content stays off-screen', () => {
    const layout = resolveFullPlayerLayout(phoneInput);
    expect(layout.peekHeight).toBe(FULL_PLAYER_CHIP_HEADER_HEIGHT + phoneInput.safeAreaBottom);
  });

  it('reserves a measured chip strip taller than the default-text-size constant', () => {
    const chipStripHeight = FULL_PLAYER_CHIP_HEADER_HEIGHT + 30;
    const layout = resolveFullPlayerLayout({ ...phoneInput, chipStripHeight });
    expect(layout.peekHeight).toBe(chipStripHeight + phoneInput.safeAreaBottom);
    expect(layout.artworkSize).toBeLessThan(resolveFullPlayerLayout(phoneInput).artworkSize);
  });

  it('ignores a measured chip strip shorter than the constant', () => {
    const layout = resolveFullPlayerLayout({ ...phoneInput, chipStripHeight: 10 });
    expect(layout.peekHeight).toBe(FULL_PLAYER_CHIP_HEADER_HEIGHT + phoneInput.safeAreaBottom);
  });

  it('collapses peek height when there are no sections', () => {
    const layout = resolveFullPlayerLayout({
      ...phoneInput,
      hasSections: false,
    });
    const usableViewport =
      phoneInput.viewportHeight - phoneInput.safeAreaTop - phoneInput.safeAreaBottom;
    expect(layout.peekHeight).toBe(0);
    expect(layout.playerRegionHeight).toBe(usableViewport);
  });

  it('returns zeroed values when viewport height is zero', () => {
    expect(
      resolveFullPlayerLayout({
        ...phoneInput,
        viewportHeight: 0,
      })
    ).toEqual({
      artworkSize: 0,
      peekHeight: 0,
      playerRegionHeight: 0,
      viewerHeight: 0,
    });
  });
});
