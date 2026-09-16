/** Trailing air past the last glyph at full scroll, so the end does not sit against the edge. */
export const MARQUEE_TAIL_GAP = 12;

/** Scroll speed. Slow enough to read a long episode title while it passes. */
export const MARQUEE_SPEED_DP_PER_SECOND = 28;

/** Pause with the start of the label visible before scrolling, and again at the end. */
export const MARQUEE_EDGE_HOLD_MS = 1600;

/** Snap back to the start rather than reversing, so each pass reads the same way. */
export const MARQUEE_RESET_MS = 320;

/** Sub-pixel differences are measurement noise, not overflow worth animating. */
const OVERFLOW_EPSILON = 1;

/**
 * Whether a label overflows its viewport by enough to be worth scrolling.
 *
 * Reduce Motion turns scrolling off entirely: the label then truncates, which is the same
 * information at rest.
 */
export const shouldMarqueeScroll = ({
  contentWidth,
  reduceMotion,
  viewportWidth,
}: {
  contentWidth: number;
  reduceMotion: boolean;
  viewportWidth: number;
}): boolean => {
  if (reduceMotion || viewportWidth <= 0 || contentWidth <= 0) {
    return false;
  }
  return contentWidth - viewportWidth > OVERFLOW_EPSILON;
};

/** How far the label travels: the hidden overflow plus trailing air. */
export const marqueeScrollDistance = (contentWidth: number, viewportWidth: number): number => {
  return Math.max(0, contentWidth - viewportWidth) + MARQUEE_TAIL_GAP;
};

/** Travel time at a constant speed, so short and long titles scroll at the same rate. */
export const marqueeScrollDurationMs = (distance: number): number => {
  return Math.round((Math.max(0, distance) / MARQUEE_SPEED_DP_PER_SECOND) * 1000);
};
