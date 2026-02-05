'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';
import { getQueryParamFromQueueMediumId } from '@podverse/helpers';

import { CommonItemHeader } from '../../Common/Item/CommonItemHeader';
import { AddByRSSItemHeaderPlaySection } from '../Item/AddByRSSItemHeaderPlaySection';
import styles from '../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';
import type { AddByRSSFeedRecord } from '../../../utils/addByRSS/types';

const alertPlaceholder = (label: string) => () => {
  window.alert(`Add by RSS: ${label}`);
};

type AddByRSSLivestreamHeaderProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSLivestreamHeader: React.FC<AddByRSSLivestreamHeaderProps> = ({ feed }) => {
  const tMediaPlayer = useTranslations('media_player');
  const tFeatures = useTranslations('features');
  const title = feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;
  const mediumParam = getQueryParamFromQueueMediumId(
    feed.mappedFeed?.channel?.channel?.medium_id ?? null
  );
  const mediumSlug = mediumParam === 'music' ? 'music' : 'podcast';
  const detailUrl = `/add-by-rss/${mediumSlug}/livestream/${feed.idText}`;

  const titleNode = (
    <Link href={detailUrl}>
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
