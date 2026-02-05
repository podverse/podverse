'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

import { formatDateAbbrev } from '@podverse/helpers';

import { Image } from '../../../Image/Image';
import { IMAGES } from '../../../../constants/images';
import styles from '../../../../styles/components/Common/List/ListGridNode.module.scss';
import type { AddByRSSEpisodeIndexItem } from '../../../../utils/addByRSS/types';

type AddByRSSEpisodeGridItemProps = {
  item: AddByRSSEpisodeIndexItem;
  showChannelInfo?: boolean;
};

export const AddByRSSEpisodeGridItem: React.FC<AddByRSSEpisodeGridItemProps> = ({
  item,
  showChannelInfo,
}) => {
  const tMedia = useTranslations('media');
  const locale = useLocale();
  const title = item.bundle.item.title ?? tMedia('podcast.episode_image');
  const imageUrl = item.bundle.images?.[0]?.url ?? item.feedImageUrl;
  const lastPubDateRaw = item.bundle.item.pub_date ?? null;
  const lastPubDate =
    typeof lastPubDateRaw === 'string' ? lastPubDateRaw : lastPubDateRaw?.toISOString();

  return (
    <Link href={`/add-by-rss/episode/${item.itemGuid}`} className={styles.link}>
      <div className={styles.gridNode}>
        <Image
          src={imageUrl}
          alt={title}
          width={IMAGES.LIST.GRID.SIZE}
          height={IMAGES.LIST.GRID.SIZE}
          className={styles.image}
        />
        <div className={styles.title}>{title}</div>
        {showChannelInfo && <div className={styles.channelTitle}>{item.feedTitle}</div>}
        {lastPubDate ? (
          <span className={styles.lastPubDate}>{formatDateAbbrev(lastPubDate, locale)}</span>
        ) : null}
      </div>
    </Link>
  );
};
