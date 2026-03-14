'use client';

import React from 'react';

import type { DTOChannel, QueryParamsMedium } from '@podverse/helpers';

import { CommonCombinedChannelNodes } from '../../Common/CombinedChannels/CommonCombinedChannelNodes';
import type { CombinedChannelListItem } from '../../Common/CombinedChannels/types';
import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';
import { CoreCombinedChannelGridNode } from './CoreCombinedChannelGridNode';
import { CoreCombinedChannelRow } from './CoreCombinedChannelRow';

interface Props {
  channels: DTOChannel[];
  viewSelected: ViewSelectedOption;
  filterMedium: QueryParamsMedium;
}

export const CoreCombinedChannelNodes: React.FC<Props> = ({
  channels,
  viewSelected,
  filterMedium,
}) => {
  const items: CombinedChannelListItem[] = channels.map((channel) => ({
    id: String(channel.id),
    rowNode: <CoreCombinedChannelRow channel={channel} filterMedium={filterMedium} />,
    gridNode: <CoreCombinedChannelGridNode channel={channel} filterMedium={filterMedium} />,
  }));

  return <CommonCombinedChannelNodes items={items} viewSelected={viewSelected} />;
};
