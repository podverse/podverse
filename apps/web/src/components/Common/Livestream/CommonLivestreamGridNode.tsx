'use client';

import React from 'react';
import type { DTOChannel, DTOItem, DTOLiveItem } from '@podverse/helpers';

import { ListLiveItemGridNode } from '../../List/LiveItem/ListLiveItemGridNode';

type CommonLivestreamListGridNodeProps = {
  channel: DTOChannel;
  item: DTOItem;
  live_item: DTOLiveItem;
  showChannelInfo?: boolean;
};

export const CommonLivestreamListGridNode: React.FC<CommonLivestreamListGridNodeProps> = (
  props
) => {
  return <ListLiveItemGridNode {...props} />;
};
