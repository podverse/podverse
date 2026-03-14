'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import { getQueryParamFromQueueMediumId } from '@podverse/helpers';

import type { AddByRSSFeedRecord } from '../../../utils/addByRSS/types';
import { CommonItemHeader } from '../../Common/Item/CommonItemHeader';
import { AddByRSSItemHeaderPlaySection } from '../Item/AddByRSSItemHeaderPlaySection';

import styles from '../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

const alertPlaceholder = (label: string) => () => {
  window.alert(`Add by RSS: ${label}`);
};

type AddByRSSLivestreamHeaderProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSLivestreamHeader: React.FC<AddByRSSLivestreamHeaderProps> = ({ feed }) => {
  const tMediaPlayer = useTranslations('media_player');
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

  return (
    <CommonItemHeader
      titleNode={titleNode}
      playSectionNode={
        <AddByRSSItemHeaderPlaySection onPlay={alertPlaceholder(tMediaPlayer('play'))} />
      }
    />
  );
};
