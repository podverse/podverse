import { Image } from 'expo-image';

export type TrackDetailRouteParams = {
  trackId: string;
  previewImageUrl?: string | null;
  previewTitle?: string;
};

export type BuildTrackDetailParamsInput = {
  trackId: string;
  previewImageUrl?: string | null;
  previewTitle?: string | null;
};

/**
 * Build TrackDetail navigate params. Callers that already painted a row pass the same list-size
 * image URL and title so CoverImage can reuse the disk cache on first paint.
 *
 * Fire-and-forget prefetches the preview image — never awaits before navigate.
 */
export const buildTrackDetailParams = (
  input: BuildTrackDetailParamsInput
): TrackDetailRouteParams => {
  const params: TrackDetailRouteParams = {
    trackId: input.trackId,
  };

  const title =
    input.previewTitle !== null &&
    input.previewTitle !== undefined &&
    input.previewTitle.trim().length > 0
      ? input.previewTitle.trim()
      : undefined;
  if (title !== undefined) {
    params.previewTitle = title;
  }

  if (input.previewImageUrl !== undefined) {
    const image =
      input.previewImageUrl !== null && input.previewImageUrl.trim().length > 0
        ? input.previewImageUrl.trim()
        : null;
    params.previewImageUrl = image;
    if (image !== null) {
      void Image.prefetch(image);
    }
  }

  return params;
};
