/** Fallback ratio (16:9) used when a source has no intrinsic video dimensions. */
export const DEFAULT_MODAL_VIDEO_ASPECT_RATIO = 16 / 9;

export function getVideoElementAspectRatio(video: HTMLVideoElement): number | null {
  if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) {
    return video.videoWidth / video.videoHeight;
  }
  return null;
}

/**
 * Aspect ratio to render the modal video stage with. Returns the intrinsic ratio when known.
 * Once metadata has loaded (`readyState >= 1`) but the source reports no intrinsic dimensions
 * (audio-only enclosure, or a video whose metadata omits dimensions), falls back to a default so
 * the stage reveals instead of spinning forever. Returns `null` only while metadata is still
 * loading, which keeps the loading spinner showing during that window.
 */
export function resolveModalVideoAspectRatio(video: HTMLVideoElement): number | null {
  const intrinsic = getVideoElementAspectRatio(video);
  if (intrinsic !== null) {
    return intrinsic;
  }
  if (video.readyState >= 1) {
    return DEFAULT_MODAL_VIDEO_ASPECT_RATIO;
  }
  return null;
}
