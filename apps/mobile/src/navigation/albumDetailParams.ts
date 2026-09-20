import { Image } from 'expo-image';

import { getChannelActionChrome } from '../lib/channelActionChrome';

export type AlbumDetailRouteParams = {
  albumId: string;
  previewImageUrl?: string | null;
  previewIsSubscribed?: boolean;
  previewNotificationsEnabled?: boolean;
  previewTitle?: string;
};

export type BuildAlbumDetailParamsInput = {
  albumId: string;
  previewImageUrl?: string | null;
  previewIsSubscribed?: boolean;
  previewNotificationsEnabled?: boolean;
  previewTitle?: string | null;
};

export const buildAlbumDetailParams = (
  input: BuildAlbumDetailParamsInput
): AlbumDetailRouteParams => {
  const cached = getChannelActionChrome(input.albumId);
  const params: AlbumDetailRouteParams = {
    albumId: input.albumId,
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
