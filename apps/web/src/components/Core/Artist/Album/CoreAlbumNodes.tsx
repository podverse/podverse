'use client';

import type { DTOChannel } from '@podverse/helpers';
import { findDTOChannelImageBySize } from '@podverse/helpers';
import React from 'react';

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
    const channelImage = findDTOChannelImageBySize(
      channel.channel_images,
      IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
      'lesser'
    );

    return {
      id: String(channel.id),
      title: channel.title ?? '',
      imageUrl: channelImage?.url,
      href: `${ROUTES.ALBUM}/${channel.id_text}`,
      subtitle: channel.channel_about?.author ?? null,
    };
  });

  return <CommonAlbumListNodes items={items} viewSelected={viewSelected} />;
}
