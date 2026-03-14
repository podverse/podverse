'use client';

import React from 'react';

import type { DTOItem } from '@podverse/helpers';

import { CoreEpisodeSummary } from '../../../../components/Core/Podcast/Episodes/CoreEpisodeSummary';
import { DetailListWrapper } from '../../../../components/List/DetailListWrapper';
import LoadingSpinnerOverlay from '../../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { useLivestreamPageContext } from './LivestreamPageContext';

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
