'use client';

import type { DTOChannel } from '@podverse/helpers';
import React from 'react';

import { CommonArtistHeader } from '../../Common/Artist/CommonArtistHeader';
import { CoreArtistHeaderViewDesktop } from './CoreArtistHeaderViewDesktop';
import { CoreArtistHeaderViewTablet } from './CoreArtistHeaderViewTablet';

type CoreArtistHeaderProps = {
  channel: DTOChannel;
};

export const CoreArtistHeader: React.FC<CoreArtistHeaderProps> = ({ channel }) => {
  return (
    <CommonArtistHeader
      desktop={<CoreArtistHeaderViewDesktop channel={channel} />}
      tablet={<CoreArtistHeaderViewTablet channel={channel} />}
    />
  );
};
