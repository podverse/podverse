'use client';

import React from 'react';

import type { DTOItem } from '@podverse/helpers';

import { ListLiveItemNodes } from '../../List/LiveItem/ListLiveItemNodes';
import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';

type CommonLivestreamListNodesProps = {
  items: DTOItem[];
  viewSelected: ViewSelectedOption;
  showChannelInfo?: boolean;
};

export const CommonLivestreamListNodes: React.FC<CommonLivestreamListNodesProps> = (props) => {
  return <ListLiveItemNodes {...props} />;
};
