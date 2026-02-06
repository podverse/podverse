'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

import { formatDateAbbrev, getQueryParamFromQueueMediumId } from '@podverse/helpers';

import { Image } from '../../Image/Image';
import { IMAGES } from '../../../constants/images';
import type { AddByRSSFeedRecord } from '../../../utils/addByRSS/types';
import styles from '../../../styles/components/Common/List/LiveItem/ListLiveItemRow.module.scss';

type AddByRSSLivestreamFeedRowProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSLivestreamFeedRow: React.FC<AddByRSSLivestreamFeedRowProps> = ({ feed }) => {
  const tMedia = useTranslations('media');
  const locale = useLocale();
  const feedTitle = feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;
  const feedImageUrl = feed.imageUrl ?? feed.mappedFeed?.channel?.images?.[0]?.url ?? undefined;
  const lastPubDate = feed.mappedFeed?.channel?.about?.last_pub_date ?? null;
  const mediumParam = getQueryParamFromQueueMediumId(
    feed.mappedFeed?.channel?.channel?.medium_id ?? null
  );
  const mediumSlug = mediumParam === 'music' ? 'music' : 'podcast';
  const url = `/add-by-rss/${mediumSlug}/livestream/${feed.idText}`;

  return (
    <div className={styles.row}>
      <Link href={url} tabIndex={-1}>
        <Image
          src={feedImageUrl}
          alt={feedTitle || tMedia('livestream.livestream_image')}
          width={IMAGES.LIST.LIVESTREAMS.DESKTOP.SIZE}
          height={IMAGES.LIST.LIVESTREAMS.DESKTOP.SIZE}
          className={styles.image}
        />
        <Image
          src={feedImageUrl}
          alt={feedTitle || tMedia('livestream.livestream_image')}
          width={IMAGES.LIST.LIVESTREAMS.MOBILE.SIZE}
          height={IMAGES.LIST.LIVESTREAMS.MOBILE.SIZE}
          className={styles.imageMobile}
        />
      </Link>
      <div className={styles.content}>
        <Link href={url}>
          <div className={styles.topSection}>
            <h3>{feedTitle}</h3>
            <div className={styles.subtitle}>{feed.feedUrl}</div>
          </div>
        </Link>
        <div className={styles.bottomSection}>
          <div className={styles.bottomSectionStart}>
            <div className={styles.timeSection}>
              {lastPubDate ? formatDateAbbrev(lastPubDate, locale) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
