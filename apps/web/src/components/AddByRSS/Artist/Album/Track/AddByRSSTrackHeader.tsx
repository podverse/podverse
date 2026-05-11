'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { AddByRSSFeedRecord } from '../../../../../utils/addByRSS/types';
import { CommonItemHeader } from '../../../../Common/Item/CommonItemHeader';
import { AddByRSSItemHeaderPlaySection } from '../../../Item/AddByRSSItemHeaderPlaySection';

import styles from '../../../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

const alertPlaceholder = (label: string) => () => {
  window.alert(`Add by RSS: ${label}`);
};

type AddByRSSTrackHeaderProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSTrackHeader: React.FC<AddByRSSTrackHeaderProps> = ({ feed }) => {
  const tMediaPlayer = useTranslations('media_player');
  const tFeatures = useTranslations('features');
  const title = feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;

  const titleNode = (
    <Link className={styles.episodeTitleLink} href={`/add-by-rss/track/${feed.idText}`}>
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
