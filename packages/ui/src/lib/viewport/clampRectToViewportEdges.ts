/**
 * Returns translation deltas so a positioned element's bounding rect stays within
 * the viewport padded by `marginPx`. When the rect is larger than the usable area on an axis,
 * the top/left edge is pinned to the padded minimum on that axis.
 */
export type ViewportClampRect = Pick<DOMRectReadOnly, 'left' | 'top' | 'width' | 'height'>;

export function clampRectToViewportEdges(
  rect: ViewportClampRect,
  viewportWidth: number,
  viewportHeight: number,
  marginPx: number
): { dx: number; dy: number } {
  const minX = marginPx;
  const maxX = viewportWidth - marginPx - rect.width;
  const minY = marginPx;
  const maxY = viewportHeight - marginPx - rect.height;

  let targetLeft: number;
  if (maxX >= minX) {
    targetLeft = Math.min(Math.max(rect.left, minX), maxX);
  } else {
    targetLeft = minX;
  }

  let targetTop: number;
  if (maxY >= minY) {
    targetTop = Math.min(Math.max(rect.top, minY), maxY);
  } else {
    targetTop = minY;
  }

  return {
    dx: targetLeft - rect.left,
    dy: targetTop - rect.top,
  };
}
