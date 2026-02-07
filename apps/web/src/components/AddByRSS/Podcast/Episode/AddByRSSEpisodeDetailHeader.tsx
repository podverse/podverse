'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

import { CommonItemHeader } from '../../../Common/Item/CommonItemHeader';
import { AddByRSSItemHeaderPlaySection } from '../../Item/AddByRSSItemHeaderPlaySection';
import styles from '../../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';
import { getAddByRSSItemPath } from '../../../../utils/addByRSS/itemPath';

const alertPlaceholder = (label: string) => () => {
  window.alert(`Add by RSS: ${label}`);
};

type AddByRSSEpisodeDetailHeaderProps = {
  itemIdText: string;
  title: string;
};

export const AddByRSSEpisodeDetailHeader: React.FC<AddByRSSEpisodeDetailHeaderProps> = ({
  itemIdText,
  title,
}) => {
  const tMediaPlayer = useTranslations('media_player');
  const tFeatures = useTranslations('features');

  const titleNode = (
    <Link href={getAddByRSSItemPath(itemIdText)}>
      <h2 className={styles.episodeTitle}>{title || 'Untitled'}</h2>
    </Link>
  );

  const moreButtonMenuItems = [
    {
      label: tMediaPlayer('play'),
      onClick: alertPlaceholder(tMediaPlayer('play')),
    },
    {
      label: tFeatures('queue.queue_next'),
      onClick: alertPlaceholder(tFeatures('queue.queue_next')),
    },
    {
      label: tFeatures('queue.queue_last'),
      onClick: alertPlaceholder(tFeatures('queue.queue_last')),
    },
    {
      label: tFeatures('playlist.add_to_playlist'),
      onClick: alertPlaceholder(tFeatures('playlist.add_to_playlist')),
    },
    {
      label: tFeatures('history.mark_as_played'),
      onClick: alertPlaceholder(tFeatures('history.mark_as_played')),
    },
    {
      label: tFeatures('download.download_episode'),
      onClick: alertPlaceholder(tFeatures('download.download_episode')),
    },
  ];

  return (
    <CommonItemHeader
      titleNode={titleNode}
      playSectionNode={
        <AddByRSSItemHeaderPlaySection
          onPlay={alertPlaceholder(tMediaPlayer('play'))}
          moreButtonMenuItems={moreButtonMenuItems}
        />
      }
    />
  );
};
