'use client';

import { useTranslations } from 'next-intl';

import type { DTOChannel } from '@podverse/helpers';

import { CommonChannelHeaderImage } from '../../Common/Media/CommonChannelHeaderImage';

type CoreArtistHeaderImageProps = {
  channel: DTOChannel;
};

export const CoreArtistHeaderImage = ({ channel }: CoreArtistHeaderImageProps) => {
  const tMedia = useTranslations('media');

  return (
    <CommonChannelHeaderImage
      channel={channel}
      alt={channel.title || tMedia('music.artist_image')}
    />
  );
};
