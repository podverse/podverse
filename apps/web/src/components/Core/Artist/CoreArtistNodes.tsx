'use client';

import React from 'react';

import type { DTOChannel } from '@podverse/helpers';
import { buildDTOChannelImageLoadCandidates } from '@podverse/helpers';

import { IMAGES } from '../../../constants/images';
import { ROUTES } from '../../../constants/routes';
import { CommonArtistListNodes } from '../../Common/Artist/CommonArtistNodes';
import type { ArtistListItem } from '../../Common/Artist/types';
import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';

interface Params {
  channels: DTOChannel[];
  viewSelected: ViewSelectedOption;
}

export function CoreArtistNodes({ channels, viewSelected }: Params): React.ReactNode {
  const items: ArtistListItem[] = channels.map((channel) => {
    const imageCandidates = buildDTOChannelImageLoadCandidates(
      channel.channel_images,
      IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
      'lesser'
    );

    return {
      id: String(channel.id),
      title: channel.title ?? '',
      imageCandidates,
      href: `${ROUTES.ARTIST}/${channel.id_text}`,
      subtitle: channel.channel_about?.author ?? null,
      showSubtitle: Boolean(channel.channel_about?.last_pub_date),
    };
  });

  return <CommonArtistListNodes items={items} viewSelected={viewSelected} />;
}
