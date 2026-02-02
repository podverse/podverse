'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useEpisodeContext } from './EpisodeContext';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import styles from '../../../styles/app/podcast/PodcastList.module.scss';
import { EpisodeSummary } from '../../../components/Media/Podcast/Episode/EpisodeSummary';
import { ListClips } from '../../../components/List/Clips/ListClips';
import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { ListItemSoundbites } from '../../../components/List/ItemSoundbites/ListItemSoundbites';
import { ListItemChapters } from '../../../components/List/ItemChapters/ListItemChapters';

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

type EpisodeListProps = {
  ssrChannel: DTOChannel;
  ssrItem: DTOItem;
};

export const EpisodeList: React.FC<EpisodeListProps> = ({ ssrChannel, ssrItem }) => {
  const {
    filterParams,
    setFilterParams,
    isLoading,
    clips,
    itemChapters,
    itemSoundbites,
    totalPages,
    transcriptRows,
    autoScrollOn,
  } = useEpisodeContext();
  const { page, type } = filterParams;

  return (
    <div className={styles.list}>
      {type === 'summary' && <EpisodeSummary description={ssrItem.item_description?.value} />}
      {type === 'chapters' && (
        <ListItemChapters
          page={page}
          setPage={(page) => setFilterParams({ ...filterParams, page })}
          item_chapters={itemChapters}
          channel={ssrChannel}
          item={ssrItem}
          totalPages={totalPages}
        />
      )}
      {type === 'soundbites' && (
        <ListItemSoundbites
          page={page}
          setPage={(page) => setFilterParams({ ...filterParams, page })}
          itemSoundbites={itemSoundbites}
          channel={ssrChannel}
          item={ssrItem}
          totalPages={totalPages}
          showSubscribeMessage={false}
        />
      )}
      {type === 'clips' && (
        <ListClips
          page={page}
          setPage={(page) => setFilterParams({ ...filterParams, page })}
          clips={clips}
          channel={ssrChannel}
          item={ssrItem}
          totalPages={totalPages}
          showSubscribeMessage={false}
        />
      )}
      {type === 'transcript' && (
        <ItemTranscript autoScrollOn={autoScrollOn} rows={transcriptRows} />
      )}
      <LoadingSpinnerOverlay isLoading={isLoading} />
    </div>
  );
};
