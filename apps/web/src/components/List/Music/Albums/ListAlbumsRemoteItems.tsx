'use client';

import type React from 'react';

import type { DTOChannel, PodcastBatchByFeedGuidResponse } from '@podverse/helpers';

import type { ViewSelectedOption } from '../../../ViewSelector/ViewSelector';
import { ListAlbumRemoteItemNodes } from './ListAlbumRemoteItemNodes';

type Props = {
  channelsAdded: DTOChannel[];
  channelsUnadded: PodcastBatchByFeedGuidResponse['feeds'];
  viewSelected: ViewSelectedOption;
};

export const ListAlbumsRemoteItems: React.FC<Props> = ({
  channelsAdded,
  channelsUnadded,
  viewSelected,
}) => {
  const listNodes = ListAlbumRemoteItemNodes({ channelsAdded, channelsUnadded, viewSelected });
  return listNodes;
};
