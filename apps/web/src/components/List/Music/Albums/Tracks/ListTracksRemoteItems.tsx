'use client';

import type { DTOItem, EpisodeByGuidResponse } from '@podverse/helpers';
import type React from 'react';
import type { ViewSelectedOption } from '../../../../ViewSelector/ViewSelector';
import { ListTrackRemoteItemNodes } from './ListTrackRemoteItemNodes';

type Props = {
  itemsAdded: DTOItem[];
  itemsUnadded: NonNullable<EpisodeByGuidResponse['episode']>[];
  viewSelected: ViewSelectedOption;
};

export const ListTracksRemoteItems: React.FC<Props> = ({
  itemsAdded,
  itemsUnadded,
  viewSelected,
}) => {
  const listNodes = ListTrackRemoteItemNodes({ itemsAdded, itemsUnadded, viewSelected });
  return listNodes;
};
