'use client';

import React from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';

import { CommonAlbumHeader } from '../../../Common/Artist/Album/CommonAlbumHeader';
import { CoreAlbumHeaderViewDesktop } from './CoreAlbumHeaderViewDesktop';
import { CoreAlbumHeaderViewTablet } from './CoreAlbumHeaderViewTablet';

type CoreAlbumHeaderProps = {
  channel: DTOChannel;
  item?: DTOItem;
};

export const CoreAlbumHeader: React.FC<CoreAlbumHeaderProps> = ({ channel, item }) => {
  return (
    <CommonAlbumHeader
      desktop={<CoreAlbumHeaderViewDesktop channel={channel} item={item} />}
      tablet={<CoreAlbumHeaderViewTablet channel={channel} item={item} />}
    />
  );
};
