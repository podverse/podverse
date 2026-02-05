import type { DTOChannel, DTOItem } from '@podverse/helpers';
import React from 'react';
import { CoreTrackHeader } from '../../../../Core/Artist/Album/Track/CoreTrackHeader';

type TrackHeaderProps = {
  item: DTOItem;
  channel: DTOChannel;
};

export const TrackHeader: React.FC<TrackHeaderProps> = ({ item, channel }) => {
  return <CoreTrackHeader item={item} channel={channel} />;
};
