'use client';

import React from 'react';

import type { DTOChannel, QueryParamsMedium } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import { CoreAlbumRow } from '../Artist/Album/CoreAlbumRow';
import { CorePodcastRow } from '../Podcast/CorePodcastRow';

interface Props {
  channel: DTOChannel;
  filterMedium: QueryParamsMedium;
}

export const CoreCombinedChannelRow: React.FC<Props> = ({ channel, filterMedium }) => {
  if (filterMedium === 'all') {
    if (channel.medium_id === MediumEnum.Music) {
      return <CoreAlbumRow channel={channel} />;
    } else {
      return <CorePodcastRow channel={channel} />;
    }
  }

  if (filterMedium === 'music') {
    return <CoreAlbumRow channel={channel} />;
  }

  return <CorePodcastRow channel={channel} />;
};
