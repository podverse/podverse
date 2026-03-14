'use client';

import React from 'react';

import type { DTOChannel } from '@podverse/helpers';
import { findDTOChannelImageBySize } from '@podverse/helpers';

import { IMAGES } from '../../../constants/images';
import { ROUTES } from '../../../constants/routes';
import { CommonPodcastListNodes } from '../../Common/Podcast/CommonPodcastNodes';
import type { PodcastListItem } from '../../Common/Podcast/types';
import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';

interface Params {
  channels: DTOChannel[];
  viewSelected: ViewSelectedOption;
}

export function CorePodcastNodes({ channels, viewSelected }: Params): React.ReactNode {
  const items: PodcastListItem[] = channels.map((channel) => {
    const channelImage = findDTOChannelImageBySize(
      channel.channel_images,
      IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
      'lesser'
    );

    return {
      id: String(channel.id),
      title: channel.title ?? '',
      imageUrl: channelImage?.url,
      href: `${ROUTES.PODCAST}/${channel.id_text}`,
      lastPubDate: channel.channel_about?.last_pub_date ?? null,
    };
  });

  return <CommonPodcastListNodes items={items} viewSelected={viewSelected} />;
}
