'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import {
  buildDTOChannelImageLoadCandidates,
  formatDateAbbrev,
  prependDistinctImageCandidate,
} from '@podverse/helpers';

import { IMAGES } from '../../../../constants/images';
import type { AddByRSSFeedRecord } from '../../../../utils/addByRSS/types';
import { SkeletonFlashImage } from '../../../Image/SkeletonFlashImage';

import styles from '../../../../styles/components/Common/List/ListGridNode.module.scss';

type AddByRSSEpisodeGridNodeProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSEpisodeGridNode: React.FC<AddByRSSEpisodeGridNodeProps> = ({ feed }) => {
  const tMedia = useTranslations('media');
  const locale = useLocale();
  const feedTitle = feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;
  const channelImages = feed.mappedFeed?.channel?.images;
  const imageCandidates = prependDistinctImageCandidate(
    feed.imageUrl,
    buildDTOChannelImageLoadCandidates(channelImages, IMAGES.LIST.GRID.SIZE_FIND_TARGET, 'lesser')
  );
  const lastPubDate = feed.mappedFeed?.channel?.about?.last_pub_date ?? null;
  const url = `/add-by-rss/podcast/${feed.idText}`;

  return (
    <Link href={url} className={styles.link}>
      <div className={styles.gridNode}>
        <SkeletonFlashImage
          candidates={imageCandidates}
          alt={feedTitle || tMedia('podcast.episode_image')}
          width={IMAGES.LIST.GRID.SIZE}
          height={IMAGES.LIST.GRID.SIZE}
          className={styles.image}
        />
        <div className={styles.title}>{feedTitle}</div>
        {lastPubDate ? (
          <span className={styles.lastPubDate}>{formatDateAbbrev(lastPubDate, locale)}</span>
        ) : null}
      </div>
    </Link>
  );
};
