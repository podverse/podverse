'use client';

import React from 'react';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers';

import { HeaderButtons } from '../../Media/Header/HeaderButtons';

type CorePodcastHeaderButtonsProps = {
  channel: DTOChannel;
  item?: DTOItem;
  clip?: DTOClip;
  item_chapter?: DTOItemChapter;
  item_soundbite?: DTOItemSoundbite;
};

export const CorePodcastHeaderButtons: React.FC<CorePodcastHeaderButtonsProps> = ({
  channel,
  item = null,
  clip = null,
  item_chapter = null,
  item_soundbite = null,
}) => {
  return (
    <HeaderButtons
      channel={channel}
      shareArgs={{ item, clip, item_chapter, item_soundbite }}
      kind="podcast"
    />
  );
};
