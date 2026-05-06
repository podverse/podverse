'use client';

import React from 'react';

import type { DTOChannel } from '@podverse/helpers';
import { buildDTOChannelImageLoadCandidates } from '@podverse/helpers';

import { IMAGES } from '../../../constants/images';
import { ROUTES } from '../../../constants/routes';
import { CommonArtistListRow } from '../../Common/Artist/CommonArtistRow';
import type { ArtistListItem } from '../../Common/Artist/types';

interface Props {
  channel: DTOChannel;
}

export const CoreArtistRow: React.FC<Props> = ({ channel }) => {
  const url = `${ROUTES.ARTIST}/${channel.id_text}`;
  const imageCandidates = buildDTOChannelImageLoadCandidates(
    channel.channel_images,
    IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
    'lesser'
  );

  const item: ArtistListItem = {
    id: String(channel.id),
    title: channel.title ?? '',
    imageCandidates,
    href: url,
    subtitle: channel.channel_about?.author ?? null,
    showSubtitle: Boolean(channel.channel_about?.last_pub_date),
  };

  return <CommonArtistListRow item={item} />;
};
