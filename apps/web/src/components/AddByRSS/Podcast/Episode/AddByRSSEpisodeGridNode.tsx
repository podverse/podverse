'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

import { formatDateAbbrev } from '@podverse/helpers';

import { Image } from '../../../Image/Image';
import { IMAGES } from '../../../../constants/images';
import styles from '../../../../styles/components/Common/List/ListGridNode.module.scss';
import type { AddByRSSFeedRecord } from '../../../../utils/addByRSS/types';

type AddByRSSEpisodeGridNodeProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSEpisodeGridNode: React.FC<AddByRSSEpisodeGridNodeProps> = ({ feed }) => {
  const tMedia = useTranslations('media');
  const locale = useLocale();
  const feedTitle = feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;
  const feedImageUrl = feed.imageUrl ?? feed.mappedFeed?.channel?.images?.[0]?.url ?? undefined;
  const lastPubDate = feed.mappedFeed?.channel?.about?.last_pub_date ?? null;
  const url = `/add-by-rss/episode/${feed.idText}`;

  return (
    <Link href={url} className={styles.link}>
      <div className={styles.gridNode}>
        <Image
          src={feedImageUrl}
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
