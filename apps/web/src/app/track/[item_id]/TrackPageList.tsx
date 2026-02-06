'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { DTOItem } from '@podverse/helpers';
import { useTrackPageContext } from './TrackPageContext';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { CoreEpisodeSummary } from '../../../components/Core/Podcast/Episodes/CoreEpisodeSummary';

const ItemTranscript = dynamic(
  () =>
    import('../../../components/ItemTranscript/ItemTranscript').then((m) => ({
      default: m.ItemTranscript,
    })),
  {
    ssr: false,
    loading: () => <div aria-label="Loading transcript" style={{ minHeight: 400 }} />,
  }
);

type TrackPageListProps = {
  ssrItem: DTOItem;
};

export const TrackPageList: React.FC<TrackPageListProps> = ({ ssrItem }) => {
  const { filterParams, isLoading, transcriptRows, autoScrollOn } = useTrackPageContext();
  const { type } = filterParams;

  return (
    <DetailListWrapper>
      {type === 'summary' && <CoreEpisodeSummary description={ssrItem.item_description?.value} />}
      {type === 'transcript' && (
        <ItemTranscript autoScrollOn={autoScrollOn} rows={transcriptRows} />
      )}
      <LoadingSpinnerOverlay isLoading={isLoading} />
    </DetailListWrapper>
  );
};
