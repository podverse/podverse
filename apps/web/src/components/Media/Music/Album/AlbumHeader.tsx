import type { DTOChannel, DTOItem } from '@podverse/helpers';
import React from 'react';
import { CoreAlbumHeader } from '../../../Core/Artist/Album/CoreAlbumHeader';

type AlbumHeaderProps = {
  channel: DTOChannel;
  item?: DTOItem;
};

export const AlbumHeader: React.FC<AlbumHeaderProps> = ({ channel, item }) => {
  return <CoreAlbumHeader channel={channel} item={item} />;
};
