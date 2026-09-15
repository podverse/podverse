import { Image } from 'expo-image';

/**
 * Params for opening Podcast Detail with already-known list chrome so the header can paint
 * on the first frame (no gray empty cover while the channel DTO loads).
 */
export type PodcastDetailRouteParams = {
  podcastId: string;
  previewImageUrl?: string | null;
  previewTitle?: string;
};

export type BuildPodcastDetailParamsInput = {
  podcastId: string;
  previewImageUrl?: string | null;
  previewTitle?: string | null;
};

/**
 * Build PodcastDetail navigate params. Callers that already painted a row must pass the same
 * list-size image URL and title so CoverImage can reuse the disk cache.
 *
 * Fire-and-forget prefetches the preview image — never awaits before navigate.
 */
export const buildPodcastDetailParams = (
  input: BuildPodcastDetailParamsInput
): PodcastDetailRouteParams => {
  const params: PodcastDetailRouteParams = {
    podcastId: input.podcastId,
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
