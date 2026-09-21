export type FullPlayerLayoutInput = {
  /**
   * Measured height of the rendered chip strip. Larger than the constant at accessibility text
   * sizes, so the peek reserve tracks what is actually on screen instead of assuming the default.
   */
  chipStripHeight?: number;
  hasSections: boolean;
  isTablet: boolean;
  maxContentWidth: number;
  safeAreaBottom: number;
  safeAreaTop: number;
  /**
   * Gap under the pane sheet (matches the sheet's horizontal margin token) so the bottom radius
   * sits above the home indicator instead of flush to the screen edge.
   */
  sheetBottomInset: number;
  viewportHeight: number;
  viewportWidth: number;
};

export type FullPlayerLayout = {
  artworkSize: number;
  /**
   * Viewport-derived slot for the ink pane sheet: chips at the top of the fold, bottom radius on
   * screen. The wrapper uses this as minHeight and matching height/maxHeight so every tab paints
   * the same card and long content cannot grow the outer column.
   */
  paneSheetHeight: number;
  peekHeight: number;
  playerRegionHeight: number;
  /** Space left for the artwork band after every fixed band and seam is reserved. */
  viewerHeight: number;
};

/**
 * Row under the artwork that names the clip, official clip, or chapter and its start–end clock.
 * Always reserved, whether or not there is a name to show, so a chapter arriving cannot move the
 * artwork or the transport.
 */
export const FULL_PLAYER_SEGMENT_BAND_HEIGHT = 56;
/** Episode title + channel title share one band with a tight internal gap. */
export const FULL_PLAYER_TITLE_BLOCK_HEIGHT = 48;
export const FULL_PLAYER_PROGRESS_BLOCK_HEIGHT = 52;
export const FULL_PLAYER_TRANSPORT_ROW_HEIGHT = 72;
export const FULL_PLAYER_UTILITY_ROW_HEIGHT = 48;

/**
 * Default seam between bands in the fixed region (title, artwork, segment, progress). The region
 * styles read this constant so the space the math reserves is the space the bands actually get.
 */
export const FULL_PLAYER_REGION_GAP = 16;
/**
 * Tighter seams between progress → transport and transport → utility, matching web's modal
 * progress-to-controls spacing.
 */
export const FULL_PLAYER_CONTROL_STACK_GAP = 8;
/** Title → artwork → segment → progress: three default seams. */
export const FULL_PLAYER_REGION_GAP_COUNT = 3;
/** Progress → transport → utility: two control-stack seams. */
export const FULL_PLAYER_CONTROL_STACK_GAP_COUNT = 2;

/**
 * Space between the header bar and the episode title. Counted as reserved chrome so the bands add
 * up to the region height instead of overflowing it by this much at the bottom.
 */
export const FULL_PLAYER_REGION_TOP_PADDING = 16;
/**
 * Space between the utility row and the section chips. Separates player chrome from the tab strip
 * without a second control-stack gap.
 */
export const FULL_PLAYER_REGION_BOTTOM_PADDING = 24;

/** Glyph size for the skip and jump controls, sized to read as a primary transport target. */
export const FULL_PLAYER_TRANSPORT_ICON_SIZE = 30;

/** Glyph size for the sleep-timer and More controls, which sit a step below transport. */
export const FULL_PLAYER_UTILITY_ICON_SIZE = 26;

/**
 * Caps on the square. Nothing floors it: the artwork is the band that gives way, so a short
 * viewport shrinks it rather than pushing the chip strip off the bottom edge.
 */
export const FULL_PLAYER_ARTWORK_MAX_PHONE = 420;
export const FULL_PLAYER_ARTWORK_MAX_TABLET = 520;

/**
 * Chip strip at default text size. A floor for the rendered strip and the fallback reserve until
 * the strip reports its measured height.
 */
export const FULL_PLAYER_CHIP_HEADER_HEIGHT = 52;

const asNonNegative = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
};

export const resolveFullPlayerChipStripHeight = (chipStripHeight?: number): number => {
  return Math.max(FULL_PLAYER_CHIP_HEADER_HEIGHT, asNonNegative(chipStripHeight ?? 0));
};

export const resolveFullPlayerPeekHeight = (
  hasSections: boolean,
  safeAreaBottom: number,
  chipStripHeight?: number
): number => {
  if (!hasSections) {
    return 0;
  }
  return resolveFullPlayerChipStripHeight(chipStripHeight) + asNonNegative(safeAreaBottom);
};

const fixedChromeHeight =
  FULL_PLAYER_REGION_TOP_PADDING +
  FULL_PLAYER_REGION_BOTTOM_PADDING +
  FULL_PLAYER_SEGMENT_BAND_HEIGHT +
  FULL_PLAYER_TITLE_BLOCK_HEIGHT +
  FULL_PLAYER_PROGRESS_BLOCK_HEIGHT +
  FULL_PLAYER_TRANSPORT_ROW_HEIGHT +
  FULL_PLAYER_UTILITY_ROW_HEIGHT +
  FULL_PLAYER_REGION_GAP * FULL_PLAYER_REGION_GAP_COUNT +
  FULL_PLAYER_CONTROL_STACK_GAP * FULL_PLAYER_CONTROL_STACK_GAP_COUNT;

export const resolveFullPlayerLayout = (input: FullPlayerLayoutInput): FullPlayerLayout => {
  const viewportHeight = asNonNegative(input.viewportHeight);
  const viewportWidth = asNonNegative(input.viewportWidth);
  if (viewportHeight <= 0 || viewportWidth <= 0) {
    return {
      artworkSize: 0,
      paneSheetHeight: 0,
      peekHeight: 0,
      playerRegionHeight: 0,
      viewerHeight: 0,
    };
  }

  const safeAreaTop = asNonNegative(input.safeAreaTop);
  const safeAreaBottom = asNonNegative(input.safeAreaBottom);
  const sheetBottomInset = asNonNegative(input.sheetBottomInset);
  const stripHeight = input.hasSections
    ? resolveFullPlayerChipStripHeight(input.chipStripHeight)
    : 0;
  const peekHeight = Math.min(
    resolveFullPlayerPeekHeight(input.hasSections, safeAreaBottom, input.chipStripHeight),
    Math.max(0, viewportHeight - safeAreaTop)
  );
  const reservedBelowRegion = input.hasSections ? peekHeight : safeAreaBottom;

  // The region never exceeds what the viewport can give it: the chips are the last thing to lose
  // space, so a short screen shrinks the artwork instead of pushing the strip past the bottom edge.
  const playerRegionHeight = Math.max(0, viewportHeight - safeAreaTop - reservedBelowRegion);

  const viewerHeight = Math.max(0, playerRegionHeight - fixedChromeHeight);

  // Locked frame when scrolled to the sheet: chips + sheet + bottom gap fill the viewport.
  // Outer content is that frame plus the player region, so max scroll equals playerRegionHeight.
  const bottomGap = input.hasSections ? safeAreaBottom + sheetBottomInset : 0;
  const paneSheetHeight = input.hasSections
    ? Math.max(0, viewportHeight - stripHeight - bottomGap)
    : 0;

  const contentWidth = Math.max(0, Math.min(viewportWidth, asNonNegative(input.maxContentWidth)));
  const artworkCap = input.isTablet
    ? FULL_PLAYER_ARTWORK_MAX_TABLET
    : FULL_PLAYER_ARTWORK_MAX_PHONE;
  const maxSquareBySpace = Math.min(contentWidth, viewerHeight);
  const artworkSize = maxSquareBySpace <= 0 ? 0 : Math.min(maxSquareBySpace, artworkCap);

  return {
    artworkSize,
    paneSheetHeight,
    peekHeight,
    playerRegionHeight,
    viewerHeight,
  };
};
