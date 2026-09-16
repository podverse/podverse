/** Finger travel (pt) allowed before a cover press is treated as a drag, not a tap. */
export const COVER_IMAGE_TAP_SLOP = 10;

export type CoverImageTapPoint = {
  x: number;
  y: number;
};

/**
 * True when the touch never left the tap slop. A drag that starts on large artwork stays inside
 * the `Pressable` bounds, so `onPress` still fires unless movement is checked.
 */
export const isDeliberateCoverImageTap = (
  start: CoverImageTapPoint | null,
  end: CoverImageTapPoint
): boolean => {
  if (start === null) {
    return true;
  }
  return (
    Math.abs(end.x - start.x) <= COVER_IMAGE_TAP_SLOP &&
    Math.abs(end.y - start.y) <= COVER_IMAGE_TAP_SLOP
  );
};
