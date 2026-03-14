import React from 'react';

import type { DTOChannel, DTOItem, QueryParamsQueueMedium } from '@podverse/helpers';

import { CoreLivestreamHeader } from '../../Core/Livestream/CoreLivestreamHeader';

type LivestreamHeaderProps = {
  item: DTOItem;
  channel: DTOChannel;
  medium: QueryParamsQueueMedium;
};

export const LivestreamHeader: React.FC<LivestreamHeaderProps> = ({ item, channel, medium }) => {
  return <CoreLivestreamHeader item={item} channel={channel} medium={medium} />;
};
