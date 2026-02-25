'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

import { getQueryParamFromQueueMediumId } from '@podverse/helpers';

import { Image } from '../../Image/Image';
import { ReadableDate } from '../../Time/ReadableDate';
import { ReadableTime } from '../../Time/ReadableTime';
import { IMAGES } from '../../../constants/images';
import { getAddByRSSLivestreamPath } from '../../../utils/addByRSS/itemPath';
import type { AddByRSSLivestreamIndexItem } from '../../../utils/addByRSS/types';
import styles from '../../../styles/components/Common/List/ListGridNode.module.scss';

type AddByRSSLivestreamGridNodeProps = {
  item: AddByRSSLivestreamIndexItem;
  showChannelInfo?: boolean;
};

export const AddByRSSLivestreamGridNode: React.FC<AddByRSSLivestreamGridNodeProps> = ({
  item,
  showChannelInfo,
}) => {
  const tMedia = useTranslations('media');
  const mediumParam = getQueryParamFromQueueMediumId(item.mediumId) ?? 'podcast';
  const mediumSlug = mediumParam === 'music' ? 'music' : 'podcast';
  const url = getAddByRSSLivestreamPath(item.idText, mediumSlug);
  const title = item.item.title ?? tMedia('livestream.livestream');
  const imageUrl = item.item.image ?? item.channelImageUrl ?? undefined;

  return (
    <Link href={url} className={styles.link}>
      <div className={styles.gridNode}>
        <Image
          src={imageUrl}
          alt={title || tMedia('livestream.livestream_image')}
          width={IMAGES.LIST.GRID.SIZE}
          height={IMAGES.LIST.GRID.SIZE}
          className={styles.image}
        />
        <div className={styles.title}>{title}</div>
        {showChannelInfo && <div className={styles.channelTitle}>{item.channelTitle}</div>}
        <div className={styles.lastPubDate}>
          <ReadableDate date={item.liveItem.start_time?.toISOString?.() ?? ''} />
          {' • '}
          <ReadableTime
            start={item.liveItem.start_time?.toISOString?.() ?? ''}
            end={item.liveItem.end_time?.toISOString?.() ?? null}
          />
        </div>
      </div>
    </Link>
  );
};
