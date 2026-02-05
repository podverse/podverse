'use client';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers';
import React from 'react';

import { CommonPodcastHeader } from '../../Common/Podcast/CommonPodcastHeader';
import { CorePodcastHeaderViewDesktop } from './CorePodcastHeaderViewDesktop';
import { CorePodcastHeaderViewTablet } from './CorePodcastHeaderViewTablet';

type CorePodcastHeaderProps = {
  channel: DTOChannel;
  item?: DTOItem;
  clip?: DTOClip;
  item_soundbite?: DTOItemSoundbite;
  item_chapter?: DTOItemChapter;
};

export const CorePodcastHeader: React.FC<CorePodcastHeaderProps> = ({
  channel,
  item,
  clip,
  item_soundbite,
  item_chapter,
}) => {
  return (
    <CommonPodcastHeader
      desktop={
        <CorePodcastHeaderViewDesktop
          channel={channel}
          item={item}
          clip={clip}
          item_soundbite={item_soundbite}
          item_chapter={item_chapter}
        />
      }
      tablet={
        <CorePodcastHeaderViewTablet
          channel={channel}
          item={item}
          clip={clip}
          item_soundbite={item_soundbite}
          item_chapter={item_chapter}
        />
      }
    />
  );
};
