import type { DTOChannel, DTOItem } from '@podverse/helpers';
import React from 'react';
import { CoreEpisodeHeader } from '../../../Core/Podcast/Episodes/CoreEpisodeHeader';

type EpisodeHeaderProps = {
  item: DTOItem;
  channel: DTOChannel;
};

export const EpisodeHeader: React.FC<EpisodeHeaderProps> = ({ item, channel }) => {
  return <CoreEpisodeHeader item={item} channel={channel} />;
};
