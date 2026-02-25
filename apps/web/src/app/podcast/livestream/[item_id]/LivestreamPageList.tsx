'use client';

import React from 'react';
import type { DTOItem } from '@podverse/helpers';
import { useLivestreamPageContext } from './LivestreamPageContext';
import LoadingSpinnerOverlay from '../../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { DetailListWrapper } from '../../../../components/List/DetailListWrapper';
import { CoreEpisodeSummary } from '../../../../components/Core/Podcast/Episodes/CoreEpisodeSummary';

type LivestreamPageListProps = {
  ssrItem: DTOItem;
};

export const LivestreamPageList: React.FC<LivestreamPageListProps> = ({ ssrItem }) => {
  const { filterParams, isLoading } = useLivestreamPageContext();
  const { type } = filterParams;

  return (
    <DetailListWrapper>
      {type === 'summary' && <CoreEpisodeSummary description={ssrItem.item_description?.value} />}
      <LoadingSpinnerOverlay isLoading={isLoading} />
    </DetailListWrapper>
  );
};
