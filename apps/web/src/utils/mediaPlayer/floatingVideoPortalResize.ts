import {
  clampFloatingVideoPosition,
  type FloatingVideoPosition,
} from './floatingVideoPortalDrag';

export type FloatingVideoSize = { width: number; height: number };

export type FloatingVideoResizeResult = {
  size: FloatingVideoSize;
  position: FloatingVideoPosition;
};

export const FLOATING_VIDEO_MIN_WIDTH_PX = 200;
export const FLOATING_VIDEO_DEFAULT_ASPECT_RATIO = 16 / 9;

export function computeFloatingVideoMaxWidthForAnchor(
  anchorRight: number,
  anchorBottom: number,
  aspectRatio: number,
  viewportWidth: number,
  viewportHeight: number
): number {
  const maxFromAnchorLeft = anchorRight;
  const maxFromAnchorTop = anchorBottom * aspectRatio;
  const maxFromViewportWidth = viewportWidth;
  const maxFromViewportHeight = viewportHeight * aspectRatio;
  return Math.min(
    maxFromAnchorLeft,
    maxFromAnchorTop,
    maxFromViewportWidth,
    maxFromViewportHeight
  );
}

export function resolveFloatingVideoAspectRatio(container: HTMLElement): number {
  const video = container.querySelector('video');
  if (
    video instanceof HTMLVideoElement &&
    video.readyState >= 1 &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  ) {
    return video.videoWidth / video.videoHeight;
  }
  const rect = container.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    return rect.width / rect.height;
  }
  return FLOATING_VIDEO_DEFAULT_ASPECT_RATIO;
}

export function fitFloatingVideoToViewport(
  size: FloatingVideoSize,
  position: FloatingVideoPosition,
  aspectRatio: number,
  viewportWidth: number,
  viewportHeight: number
): FloatingVideoResizeResult {
  let left = position.left;
  let top = position.top;

  const globalMaxWidth = Math.min(viewportWidth, viewportHeight * aspectRatio);
  const maxWidthFromPosition = Math.min(
    viewportWidth - Math.max(0, left),
    Math.max(0, viewportHeight - Math.max(0, top)) * aspectRatio
  );
  const maxWidth = Math.min(size.width, globalMaxWidth, maxWidthFromPosition);

  let width = maxWidth;
  if (maxWidthFromPosition >= FLOATING_VIDEO_MIN_WIDTH_PX) {
    width = Math.max(FLOATING_VIDEO_MIN_WIDTH_PX, width);
  }
  width = Math.min(width, maxWidthFromPosition, globalMaxWidth);
  width = Math.max(0, width);

  let height = width / aspectRatio;

  const positionClamped = clampFloatingVideoPosition(
    left,
    top,
    width,
    height,
    viewportWidth,
    viewportHeight
  );
  left = positionClamped.left;
  top = positionClamped.top;

  const maxWidthAfterClamp = Math.min(
    viewportWidth - left,
    Math.max(0, viewportHeight - top) * aspectRatio
  );
  if (width > maxWidthAfterClamp) {
    width = Math.max(0, maxWidthAfterClamp);
    height = width / aspectRatio;
  }

  return {
    size: { width, height },
    position: { left, top },
  };
}

export function computeResizeFromBottomRightAnchor(
  anchorRight: number,
  anchorBottom: number,
  clientX: number,
  aspectRatio: number,
  viewportWidth: number,
  viewportHeight: number
): FloatingVideoResizeResult {
  const maxWidth = computeFloatingVideoMaxWidthForAnchor(
    anchorRight,
    anchorBottom,
    aspectRatio,
    viewportWidth,
    viewportHeight
  );

  let newWidth = anchorRight - clientX;
  if (maxWidth < FLOATING_VIDEO_MIN_WIDTH_PX) {
    newWidth = Math.min(Math.max(0, newWidth), maxWidth);
  } else {
    newWidth = Math.min(Math.max(FLOATING_VIDEO_MIN_WIDTH_PX, newWidth), maxWidth);
  }

  const newHeight = newWidth / aspectRatio;
  const left = anchorRight - newWidth;
  const top = anchorBottom - newHeight;

  return fitFloatingVideoToViewport(
    { width: newWidth, height: newHeight },
    { left, top },
    aspectRatio,
    viewportWidth,
    viewportHeight
  );
}
