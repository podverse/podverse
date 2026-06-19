/**
 * Returns whether a pointerdown on the floating video portal should start a drag.
 * Close chrome and plan 03 resize handles use `data-floating-video-ignore-drag`.
 */
export function shouldFloatingVideoPortalIgnoreDrag(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  if (target.closest('[data-floating-video-ignore-drag]')) {
    return true;
  }
  if (target.closest('[data-floating-video-chrome]')) {
    return true;
  }
  return false;
}

export type FloatingVideoPosition = { left: number; top: number };

/** Pointer movement past this distance starts a drag instead of a play/pause click. */
export const FLOATING_VIDEO_DRAG_START_THRESHOLD_PX = 5;

export function hasExceededFloatingVideoDragStartThreshold(
  startClientX: number,
  startClientY: number,
  clientX: number,
  clientY: number
): boolean {
  const deltaX = clientX - startClientX;
  const deltaY = clientY - startClientY;
  return (
    Math.abs(deltaX) > FLOATING_VIDEO_DRAG_START_THRESHOLD_PX ||
    Math.abs(deltaY) > FLOATING_VIDEO_DRAG_START_THRESHOLD_PX
  );
}

export function clampFloatingVideoPosition(
  left: number,
  top: number,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number
): FloatingVideoPosition {
  const maxLeft = Math.max(0, viewportWidth - width);
  const maxTop = Math.max(0, viewportHeight - height);
  return {
    left: Math.min(Math.max(0, left), maxLeft),
    top: Math.min(Math.max(0, top), maxTop),
  };
}
