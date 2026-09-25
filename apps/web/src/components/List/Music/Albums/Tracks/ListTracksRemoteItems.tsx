'use client';

import type React from 'react';

import type { DTOChannel, DTOItem, EpisodeByGuidResponse } from '@podverse/helpers';

import type { ViewSelectedOption } from '../../../../ViewSelector/ViewSelector';
import { ListTrackRemoteItemNodes } from './ListTrackRemoteItemNodes';

type Props = {
  channelsAdded: DTOChannel[];
  itemsAdded: DTOItem[];
  itemsUnadded: NonNullable<EpisodeByGuidResponse['episode']>[];
  viewSelected: ViewSelectedOption;
};

export const ListTracksRemoteItems: React.FC<Props> = ({
  channelsAdded,
  itemsAdded,
  itemsUnadded,
  viewSelected,
}) => {
  const listNodes = ListTrackRemoteItemNodes({
    channelsAdded,
    itemsAdded,
    itemsUnadded,
    viewSelected,
  });
  return listNodes;
};
