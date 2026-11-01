/** Downward travel, in points, that dismisses on release even when the flick is slow. */
export const SLIDE_UP_DISMISS_DISTANCE = 96;

/** Downward speed, in points per second, that dismisses even when the drag is still short. */
export const SLIDE_UP_DISMISS_VELOCITY = 800;

/**
 * Downward motion is positive, matching a pan's `translationY` and `velocityY`.
 * A release that ends above the rest position springs back.
 */
export function shouldDismissSlideUpSwipe(input: {
  translationY: number;
  velocityY: number;
}): boolean {
  if (!Number.isFinite(input.translationY) || !Number.isFinite(input.velocityY)) {
    return false;
  }
  if (input.translationY < 0) {
    return false;
  }
  return (
    input.translationY >= SLIDE_UP_DISMISS_DISTANCE || input.velocityY >= SLIDE_UP_DISMISS_VELOCITY
  );
}

/** Finger offset the card copies while the finger is down. Non-finite and upward stay at rest. */
export function slideUpDismissDragOffset(translationY: number): number {
  if (!Number.isFinite(translationY) || translationY < 0) {
    return 0;
  }
  return translationY;
}
