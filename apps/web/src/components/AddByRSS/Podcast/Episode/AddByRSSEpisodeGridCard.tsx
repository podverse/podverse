'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import { formatDateAbbrev } from '@podverse/helpers';

import { IMAGES } from '../../../../constants/images';
import { getAddByRSSItemPath } from '../../../../utils/addByRSS/itemPath';
import type { AddByRSSItemIndexItem } from '../../../../utils/addByRSS/types';
import { Image } from '../../../Image/Image';

import styles from '../../../../styles/components/Common/List/ListGridNode.module.scss';

type AddByRSSEpisodeGridCardProps = {
  item: AddByRSSItemIndexItem;
  showChannelInfo?: boolean;
};

export const AddByRSSEpisodeGridCard: React.FC<AddByRSSEpisodeGridCardProps> = ({
  item,
  showChannelInfo,
}) => {
  const tMedia = useTranslations('media');
  const locale = useLocale();
  const title = item.bundle.item.title ?? tMedia('podcast.episode_image');
  const imageUrl = item.bundle.images?.[0]?.url ?? item.channelImageUrl;
  const lastPubDateRaw = item.bundle.item.pub_date ?? null;
  const lastPubDate =
    typeof lastPubDateRaw === 'string' ? lastPubDateRaw : lastPubDateRaw?.toISOString();

  return (
    <Link href={getAddByRSSItemPath(item.idText)} className={styles.link}>
      <div className={styles.gridNode}>
        <Image
          src={imageUrl}
          alt={title}
          width={IMAGES.LIST.GRID.SIZE}
          height={IMAGES.LIST.GRID.SIZE}
          className={styles.image}
        />
        <div className={styles.title}>{title}</div>
        {showChannelInfo && <div className={styles.channelTitle}>{item.channelTitle}</div>}
        {lastPubDate ? (
          <span className={styles.lastPubDate}>{formatDateAbbrev(lastPubDate, locale)}</span>
        ) : null}
      </div>
    </Link>
  );
};
