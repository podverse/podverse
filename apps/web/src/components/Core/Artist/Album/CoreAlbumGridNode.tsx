'use client';

import React from 'react';

import type { DTOChannel } from '@podverse/helpers';
import { buildDTOChannelImageLoadCandidates } from '@podverse/helpers';

import { IMAGES } from '../../../../constants/images';
import { ROUTES } from '../../../../constants/routes';
import { CommonAlbumListGridNode } from '../../../Common/Artist/Album/CommonAlbumGridNode';
import type { AlbumListItem } from '../../../Common/Artist/Album/types';

interface Props {
  channel: DTOChannel;
}

export const CoreAlbumGridNode: React.FC<Props> = ({ channel }) => {
  const url = `${ROUTES.ALBUM}/${channel.id_text}`;
  const imageCandidates = buildDTOChannelImageLoadCandidates(
    channel.channel_images,
    IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
    'lesser'
  );

  const item: AlbumListItem = {
    id: String(channel.id),
    title: channel.title ?? '',
    imageCandidates,
    href: url,
    subtitle: channel.channel_about?.author ?? null,
  };

  return <CommonAlbumListGridNode item={item} />;
};
