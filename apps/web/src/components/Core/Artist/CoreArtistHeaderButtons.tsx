'use client';

import type { DTOChannel } from '@podverse/helpers';
import React from 'react';

import HeaderButtons from '../../Media/Header/HeaderButtons';

type CoreArtistHeaderButtonsProps = {
  channel: DTOChannel;
};

export const CoreArtistHeaderButtons: React.FC<CoreArtistHeaderButtonsProps> = ({ channel }) => {
  return (
    <HeaderButtons
      channel={channel}
      shareArgs={{ item: null, clip: null, item_chapter: null, item_soundbite: null }}
      kind="artist"
    />
  );
};
