import { Image } from 'expo-image';

import { getChannelActionChrome } from '../lib/channelActionChrome';

export type ArtistDetailRouteParams = {
  artistId: string;
  previewImageUrl?: string | null;
  previewIsSubscribed?: boolean;
  previewNotificationsEnabled?: boolean;
  previewTitle?: string;
};

export type BuildArtistDetailParamsInput = {
  artistId: string;
  previewImageUrl?: string | null;
  previewIsSubscribed?: boolean;
  previewNotificationsEnabled?: boolean;
  previewTitle?: string | null;
};

/**
 * Build ArtistDetail navigate params. Callers that already painted a row pass the same list-size
 * image URL and title so CoverImage can reuse the disk cache, and any subscribe state the source
 * already knows so that control does not flip after push.
 *
 * Fire-and-forget prefetches the preview image — never awaits before navigate.
 */
export const buildArtistDetailParams = (
  input: BuildArtistDetailParamsInput
): ArtistDetailRouteParams => {
  const cached = getChannelActionChrome(input.artistId);
  const params: ArtistDetailRouteParams = {
    artistId: input.artistId,
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

  const isSubscribed = input.previewIsSubscribed ?? cached?.isSubscribed;
  if (isSubscribed !== undefined) {
    params.previewIsSubscribed = isSubscribed;
  }

  const notificationsEnabled =
    input.previewNotificationsEnabled ?? cached?.notificationsEnabled ?? undefined;
  if (notificationsEnabled !== undefined) {
    params.previewNotificationsEnabled = notificationsEnabled;
  }

  return params;
};
