'use client';

import { useTranslations } from 'next-intl';

import type { DTOChannel } from '@podverse/helpers';

import { CommonChannelHeaderImage } from '../../../Common/Media/CommonChannelHeaderImage';

type CoreAlbumHeaderImageProps = {
  channel: DTOChannel;
};

export const CoreAlbumHeaderImage = ({ channel }: CoreAlbumHeaderImageProps) => {
  const tMedia = useTranslations('media');

  return (
    <CommonChannelHeaderImage
      channel={channel}
      alt={channel.title || tMedia('music.album_image')}
    />
  );
};
