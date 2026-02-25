'use client';

import type { DTOChannel } from '@podverse/helpers';
import { findDTOChannelImageBySize } from '@podverse/helpers';
import React from 'react';

import { IMAGES } from '../../../constants/images';
import { ROUTES } from '../../../constants/routes';
import { CommonPodcastListRow } from '../../Common/Podcast/CommonPodcastRow';
import type { PodcastListItem } from '../../Common/Podcast/types';

interface Props {
  channel: DTOChannel;
}

export const CorePodcastRow: React.FC<Props> = ({ channel }) => {
  const url = `${ROUTES.PODCAST}/${channel.id_text}`;
  const channelImage = findDTOChannelImageBySize(
    channel.channel_images,
    IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
    'lesser'
  );

  const item: PodcastListItem = {
    id: String(channel.id),
    title: channel.title ?? '',
    imageUrl: channelImage?.url,
    href: url,
    lastPubDate: channel.channel_about?.last_pub_date ?? null,
  };

  return <CommonPodcastListRow item={item} />;
};
