'use client';

import React from 'react';
import type { DTOItem } from '@podverse/helpers';
import { useLivestreamPageContext } from './LivestreamPageContext';
import LoadingSpinnerOverlay from '../../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { DetailListWrapper } from '../../../../components/List/DetailListWrapper';
import { EpisodeSummary } from '../../../../components/Media/Podcast/Episode/EpisodeSummary';

type LivestreamPageListProps = {
  ssrItem: DTOItem;
};

export const LivestreamPageList: React.FC<LivestreamPageListProps> = ({ ssrItem }) => {
  const { filterParams, isLoading } = useLivestreamPageContext();
  const { type } = filterParams;

  return (
    <DetailListWrapper>
      {type === 'summary' && <EpisodeSummary description={ssrItem.item_description?.value} />}
      <LoadingSpinnerOverlay isLoading={isLoading} />
    </DetailListWrapper>
  );
};
