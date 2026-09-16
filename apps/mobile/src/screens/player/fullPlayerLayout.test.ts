import { describe, expect, it } from 'vitest';

import {
  FULL_PLAYER_ARTWORK_MAX_PHONE,
  FULL_PLAYER_ARTWORK_MAX_TABLET,
  FULL_PLAYER_ARTWORK_MIN_SIZE,
  FULL_PLAYER_CONDENSE_ENTER_RATIO,
  FULL_PLAYER_CONDENSE_EXIT_RATIO,
  FULL_PLAYER_PROGRESS_BLOCK_HEIGHT,
  FULL_PLAYER_REGION_GAP,
  FULL_PLAYER_REGION_GAP_COUNT,
  FULL_PLAYER_REGION_TOP_PADDING,
  FULL_PLAYER_SEGMENT_BAND_HEIGHT,
  FULL_PLAYER_TITLE_BLOCK_HEIGHT,
  FULL_PLAYER_TRANSPORT_ROW_HEIGHT,
  FULL_PLAYER_UTILITY_ROW_HEIGHT,
  resolveCondensedState,
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
  it('merges title and channel into one band with five region gaps', () => {
    expect(FULL_PLAYER_TITLE_BLOCK_HEIGHT).toBe(48);
    expect(FULL_PLAYER_REGION_GAP_COUNT).toBe(5);
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

  it('reserves the segment band whether or not a chapter or clip is playing', () => {
    const layout = resolveFullPlayerLayout(phoneInput);
    const reservedChrome =
      FULL_PLAYER_REGION_TOP_PADDING +
      FULL_PLAYER_SEGMENT_BAND_HEIGHT +
      FULL_PLAYER_TITLE_BLOCK_HEIGHT +
      FULL_PLAYER_PROGRESS_BLOCK_HEIGHT +
      FULL_PLAYER_TRANSPORT_ROW_HEIGHT +
      FULL_PLAYER_UTILITY_ROW_HEIGHT +
      FULL_PLAYER_REGION_GAP * FULL_PLAYER_REGION_GAP_COUNT;
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

  it('keeps fixed bands and floors artwork on short viewports', () => {
    const layout = resolveFullPlayerLayout({
      ...phoneInput,
      maxContentWidth: 480,
      safeAreaBottom: 0,
      safeAreaTop: 0,
      viewportHeight: 280,
      viewportWidth: 480,
    });
    expect(layout.playerRegionHeight).toBeGreaterThan(0);
    expect(layout.viewerHeight).toBeGreaterThanOrEqual(FULL_PLAYER_ARTWORK_MIN_SIZE);
    expect(layout.artworkSize).toBe(FULL_PLAYER_ARTWORK_MIN_SIZE);
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

describe('resolveCondensedState', () => {
  const playerRegionHeight = 400;
  const enterThreshold = playerRegionHeight * FULL_PLAYER_CONDENSE_ENTER_RATIO;
  const exitThreshold = playerRegionHeight * FULL_PLAYER_CONDENSE_EXIT_RATIO;
  const betweenThresholds = (enterThreshold + exitThreshold) / 2;

  it('keeps non-condensed state between the thresholds', () => {
    expect(
      resolveCondensedState({
        isCondensed: false,
        playerRegionHeight,
        scrollOffset: betweenThresholds,
      })
    ).toBe(false);
  });

  it('keeps condensed state between the thresholds', () => {
    expect(
      resolveCondensedState({
        isCondensed: true,
        playerRegionHeight,
        scrollOffset: betweenThresholds,
      })
    ).toBe(true);
  });

  it('condenses at the enter threshold', () => {
    expect(
      resolveCondensedState({
        isCondensed: false,
        playerRegionHeight,
        scrollOffset: enterThreshold,
      })
    ).toBe(true);
  });

  it('restores below the exit threshold', () => {
    expect(
      resolveCondensedState({
        isCondensed: true,
        playerRegionHeight,
        scrollOffset: exitThreshold,
      })
    ).toBe(false);
  });
});
