'use client';

import { useTranslations } from 'next-intl';

import type { DTOChannel } from '@podverse/helpers';

import { CommonChannelHeaderImage } from '../../Common/Media/CommonChannelHeaderImage';

type CorePodcastHeaderImageProps = {
  channel: DTOChannel;
};

export const CorePodcastHeaderImage = ({ channel }: CorePodcastHeaderImageProps) => {
  const tMedia = useTranslations('media');

  return (
    <CommonChannelHeaderImage
      channel={channel}
      alt={channel.title || tMedia('podcast.podcast_image')}
    />
  );
};
