'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

import { CommonItemHeader } from '../../../../Common/Item/CommonItemHeader';
import { AddByRSSItemHeaderPlaySection } from '../../../Item/AddByRSSItemHeaderPlaySection';
import { getAddByRSSItemPath } from '../../../../../utils/addByRSS/itemPath';
import styles from '../../../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

const alertPlaceholder = (label: string) => () => {
  window.alert(`Add by RSS: ${label}`);
};

type AddByRSSTrackDetailHeaderProps = {
  itemIdText: string;
  title: string;
};

export const AddByRSSTrackDetailHeader: React.FC<AddByRSSTrackDetailHeaderProps> = ({
  itemIdText,
  title,
}) => {
  const tMediaPlayer = useTranslations('media_player');
  const tFeatures = useTranslations('features');

  const titleNode = (
    <Link href={getAddByRSSItemPath(itemIdText, 'tracks')}>
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
      label: tFeatures('download.download_track'),
      onClick: alertPlaceholder(tFeatures('download.download_track')),
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
