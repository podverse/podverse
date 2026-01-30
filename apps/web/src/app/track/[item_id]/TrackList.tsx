'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { DTOItem } from '@podverse/helpers';
import { useTrackContext } from './TrackContext';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { EpisodeSummary } from '../../../components/Media/Podcast/Episode/EpisodeSummary';
import styles from '../../../styles/app/podcast/PodcastList.module.scss';

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

type TrackListProps = {
  ssrItem: DTOItem;
};

export const TrackList: React.FC<TrackListProps> = ({ ssrItem }) => {
  const { filterParams, isLoading, transcriptRows, autoScrollOn } = useTrackContext();
  const { type } = filterParams;

  return (
    <div className={styles.list}>
      {type === 'summary' && <EpisodeSummary description={ssrItem.item_description?.value} />}
      {type === 'transcript' && (
        <ItemTranscript autoScrollOn={autoScrollOn} rows={transcriptRows} />
      )}
      <LoadingSpinnerOverlay isLoading={isLoading} />
    </div>
  );
};
