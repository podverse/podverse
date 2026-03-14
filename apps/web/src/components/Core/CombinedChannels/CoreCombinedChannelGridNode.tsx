'use client';

import React from 'react';

import type { DTOChannel, QueryParamsMedium } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import { CoreAlbumGridNode } from '../Artist/Album/CoreAlbumGridNode';
import { CorePodcastGridNode } from '../Podcast/CorePodcastGridNode';

interface Props {
  channel: DTOChannel;
  filterMedium: QueryParamsMedium;
}

export const CoreCombinedChannelGridNode: React.FC<Props> = ({ channel, filterMedium }) => {
  if (filterMedium === 'all') {
    if (channel.medium_id === MediumEnum.Music) {
      return <CoreAlbumGridNode channel={channel} />;
    } else {
      return <CorePodcastGridNode channel={channel} />;
    }
  }

  if (filterMedium === 'music') {
    return <CoreAlbumGridNode channel={channel} />;
  }

  return <CorePodcastGridNode channel={channel} />;
};
