import type { DTOChannel } from '@podverse/helpers';
import React from 'react';
import { CoreArtistHeader } from '../../../Core/Artist/CoreArtistHeader';

type ArtistHeaderProps = {
  channel: DTOChannel;
};

export const ArtistHeader: React.FC<ArtistHeaderProps> = ({ channel }) => {
  return <CoreArtistHeader channel={channel} />;
};
