export type FullPlayerLayoutInput = {
  hasSections: boolean;
  isTablet: boolean;
  maxContentWidth: number;
  safeAreaBottom: number;
  safeAreaTop: number;
  viewportHeight: number;
  viewportWidth: number;
};

export type FullPlayerLayout = {
  artworkSize: number;
  peekHeight: number;
  playerRegionHeight: number;
  viewerHeight: number;
};

export type CondensedStateInput = {
  isCondensed: boolean;
  playerRegionHeight: number;
  scrollOffset: number;
};

/**
 * Row under the artwork that names the clip, official clip, or chapter. Always reserved, whether or
 * not there is a name to show, so a chapter arriving cannot move the artwork or the transport.
 */
export const FULL_PLAYER_SEGMENT_BAND_HEIGHT = 24;
/** Episode title + channel title share one band with a tight internal gap. */
export const FULL_PLAYER_TITLE_BLOCK_HEIGHT = 48;
export const FULL_PLAYER_PROGRESS_BLOCK_HEIGHT = 52;
export const FULL_PLAYER_TRANSPORT_ROW_HEIGHT = 72;
export const FULL_PLAYER_UTILITY_ROW_HEIGHT = 48;

/**
 * Seam between every band in the fixed region. The region styles read this constant so the space
 * the math reserves is the space the bands actually get.
 */
export const FULL_PLAYER_REGION_GAP = 16;
/** Title block, artwork, segment, progress, transport, utility — five seams between six bands. */
export const FULL_PLAYER_REGION_GAP_COUNT = 5;

/**
 * Space between the header bar and the episode title. Counted as reserved chrome so the bands add
 * up to the region height instead of overflowing it by this much at the bottom.
 */
export const FULL_PLAYER_REGION_TOP_PADDING = 16;

/** Glyph size for the skip and jump controls, sized to read as a primary transport target. */
export const FULL_PLAYER_TRANSPORT_ICON_SIZE = 30;

/** Glyph size for the sleep-timer and More controls, which sit a step below transport. */
export const FULL_PLAYER_UTILITY_ICON_SIZE = 26;

export const FULL_PLAYER_ARTWORK_MIN_SIZE = 120;
export const FULL_PLAYER_ARTWORK_MAX_PHONE = 420;
export const FULL_PLAYER_ARTWORK_MAX_TABLET = 520;

export const FULL_PLAYER_PEEK_CHIP_ROW_HEIGHT = 40;
export const FULL_PLAYER_PEEK_PANE_SLIVER_HEIGHT = 20;
export const FULL_PLAYER_PEEK_HEIGHT =
  FULL_PLAYER_PEEK_CHIP_ROW_HEIGHT + FULL_PLAYER_PEEK_PANE_SLIVER_HEIGHT;

export const FULL_PLAYER_CONDENSE_ENTER_RATIO = 1;
export const FULL_PLAYER_CONDENSE_EXIT_RATIO = 0.9;

const asNonNegative = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
};

const clamp = (value: number, minimum: number, maximum: number): number => {
  if (maximum < minimum) {
    return minimum;
  }
  return Math.min(maximum, Math.max(minimum, value));
};

const fixedChromeHeight =
  FULL_PLAYER_REGION_TOP_PADDING +
  FULL_PLAYER_SEGMENT_BAND_HEIGHT +
  FULL_PLAYER_TITLE_BLOCK_HEIGHT +
  FULL_PLAYER_PROGRESS_BLOCK_HEIGHT +
  FULL_PLAYER_TRANSPORT_ROW_HEIGHT +
  FULL_PLAYER_UTILITY_ROW_HEIGHT +
  FULL_PLAYER_REGION_GAP * FULL_PLAYER_REGION_GAP_COUNT;

const minimumPlayerRegionHeight = fixedChromeHeight + FULL_PLAYER_ARTWORK_MIN_SIZE;

export const resolveFullPlayerLayout = (input: FullPlayerLayoutInput): FullPlayerLayout => {
  const viewportHeight = asNonNegative(input.viewportHeight);
  const viewportWidth = asNonNegative(input.viewportWidth);
  if (viewportHeight <= 0 || viewportWidth <= 0) {
    return {
      artworkSize: 0,
      peekHeight: 0,
      playerRegionHeight: 0,
      viewerHeight: 0,
    };
  }

  const safeAreaTop = asNonNegative(input.safeAreaTop);
  const safeAreaBottom = asNonNegative(input.safeAreaBottom);
  const usableViewportHeight = Math.max(0, viewportHeight - safeAreaTop - safeAreaBottom);

  const requestedPeekHeight = input.hasSections ? FULL_PLAYER_PEEK_HEIGHT : 0;
  const peekHeight = Math.min(requestedPeekHeight, usableViewportHeight);

  const playerRegionHeight = Math.max(minimumPlayerRegionHeight, usableViewportHeight - peekHeight);

  const viewerHeight = Math.max(
    FULL_PLAYER_ARTWORK_MIN_SIZE,
    playerRegionHeight - fixedChromeHeight
  );

  const contentWidth = Math.max(0, Math.min(viewportWidth, asNonNegative(input.maxContentWidth)));
  const artworkCap = input.isTablet
    ? FULL_PLAYER_ARTWORK_MAX_TABLET
    : FULL_PLAYER_ARTWORK_MAX_PHONE;
  const maxSquareBySpace = Math.min(contentWidth, viewerHeight);
  const artworkSize =
    maxSquareBySpace <= 0
      ? 0
      : clamp(
          maxSquareBySpace,
          Math.min(FULL_PLAYER_ARTWORK_MIN_SIZE, maxSquareBySpace),
          artworkCap
        );

  return {
    artworkSize,
    peekHeight,
    playerRegionHeight,
    viewerHeight,
  };
};

export const resolveCondensedState = (input: CondensedStateInput): boolean => {
  const playerRegionHeight = asNonNegative(input.playerRegionHeight);
  if (playerRegionHeight <= 0) {
    return false;
  }

  const offset = asNonNegative(input.scrollOffset);
  const enterThreshold = playerRegionHeight * FULL_PLAYER_CONDENSE_ENTER_RATIO;
  const exitThreshold = playerRegionHeight * FULL_PLAYER_CONDENSE_EXIT_RATIO;

  if (!input.isCondensed && offset >= enterThreshold) {
    return true;
  }
  if (input.isCondensed && offset <= exitThreshold) {
    return false;
  }
  return input.isCondensed;
};
