'use client';

import React from 'react';

import type { DTOChannel } from '@podverse/helpers';
import { buildDTOChannelImageLoadCandidates } from '@podverse/helpers';

import { IMAGES } from '../../../constants/images';
import { ROUTES } from '../../../constants/routes';
import { CommonPodcastListGridNode } from '../../Common/Podcast/CommonPodcastGridNode';
import type { PodcastListItem } from '../../Common/Podcast/types';

interface Props {
  channel: DTOChannel;
}

export const CorePodcastGridNode: React.FC<Props> = ({ channel }) => {
  const url = `${ROUTES.PODCAST}/${channel.id_text}`;
  const imageCandidates = buildDTOChannelImageLoadCandidates(
    channel.channel_images,
    IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
    'lesser'
  );

  const item: PodcastListItem = {
    id: String(channel.id),
    title: channel.title ?? '',
    imageCandidates,
    href: url,
    lastPubDate: channel.channel_about?.last_pub_date ?? null,
  };

  return <CommonPodcastListGridNode item={item} />;
};
