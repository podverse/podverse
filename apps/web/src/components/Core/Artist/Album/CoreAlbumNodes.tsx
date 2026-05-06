'use client';

import React from 'react';

import type { DTOChannel } from '@podverse/helpers';
import { buildDTOChannelImageLoadCandidates } from '@podverse/helpers';

import { IMAGES } from '../../../../constants/images';
import { ROUTES } from '../../../../constants/routes';
import { CommonAlbumListNodes } from '../../../Common/Artist/Album/CommonAlbumNodes';
import type { AlbumListItem } from '../../../Common/Artist/Album/types';
import type { ViewSelectedOption } from '../../../ViewSelector/ViewSelector';

interface Params {
  channels: DTOChannel[];
  viewSelected: ViewSelectedOption;
}

export function CoreAlbumNodes({ channels, viewSelected }: Params): React.ReactNode {
  const items: AlbumListItem[] = channels.map((channel) => {
    const imageCandidates = buildDTOChannelImageLoadCandidates(
      channel.channel_images,
      IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
      'lesser'
    );

    return {
      id: String(channel.id),
      title: channel.title ?? '',
      imageCandidates,
      href: `${ROUTES.ALBUM}/${channel.id_text}`,
      subtitle: channel.channel_about?.author ?? null,
    };
  });

  return <CommonAlbumListNodes items={items} viewSelected={viewSelected} />;
}
