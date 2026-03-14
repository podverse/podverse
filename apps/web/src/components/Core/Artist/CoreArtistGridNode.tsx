'use client';

import React from 'react';

import type { DTOChannel } from '@podverse/helpers';
import { findDTOChannelImageBySize } from '@podverse/helpers';

import { IMAGES } from '../../../constants/images';
import { ROUTES } from '../../../constants/routes';
import { CommonArtistListGridNode } from '../../Common/Artist/CommonArtistGridNode';
import type { ArtistListItem } from '../../Common/Artist/types';

interface Props {
  channel: DTOChannel;
}

export const CoreArtistGridNode: React.FC<Props> = ({ channel }) => {
  const url = `${ROUTES.ARTIST}/${channel.id_text}`;
  const channelImage = findDTOChannelImageBySize(
    channel.channel_images,
    IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
    'lesser'
  );

  const item: ArtistListItem = {
    id: String(channel.id),
    title: channel.title ?? '',
    imageUrl: channelImage?.url,
    href: url,
    subtitle: channel.channel_about?.author ?? null,
    showSubtitle: Boolean(channel.channel_about?.last_pub_date),
  };

  return <CommonArtistListGridNode item={item} />;
};
