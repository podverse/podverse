'use client';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import React from 'react';

import HeaderButtons from '../../../Media/Header/HeaderButtons';

type CoreAlbumHeaderButtonsProps = {
  channel: DTOChannel;
  item?: DTOItem;
};

export const CoreAlbumHeaderButtons: React.FC<CoreAlbumHeaderButtonsProps> = ({
  channel,
  item = null,
}) => {
  return (
    <HeaderButtons
      channel={channel}
      shareArgs={{ item, clip: null, item_chapter: null, item_soundbite: null }}
      kind="album"
    />
  );
};
