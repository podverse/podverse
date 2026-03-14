'use client';

import React from 'react';

import type { DTOChannel, DTOItem, DTOLiveItem } from '@podverse/helpers';

import { ListLiveItemRow } from '../../List/LiveItem/ListLiveItemRow';

type CommonLivestreamListRowProps = {
  channel: DTOChannel;
  item: DTOItem;
  live_item: DTOLiveItem;
  showChannelInfo?: boolean;
  showLiveItemStatus?: boolean;
};

export const CommonLivestreamListRow: React.FC<CommonLivestreamListRowProps> = (props) => {
  return <ListLiveItemRow {...props} />;
};
