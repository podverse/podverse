'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import {
  buildDTOChannelImageLoadCandidates,
  formatDateAbbrev,
  getQueryParamFromQueueMediumId,
  prependDistinctImageCandidate,
} from '@podverse/helpers';

import { IMAGES } from '../../../constants/images';
import type { AddByRSSFeedRecord } from '../../../utils/addByRSS/types';
import { ImagesPerView } from '../../Image/ImagesPerView';

import styles from '../../../styles/components/Common/List/LiveItem/ListLiveItemRow.module.scss';

type AddByRSSLivestreamFeedRowProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSLivestreamFeedRow: React.FC<AddByRSSLivestreamFeedRowProps> = ({ feed }) => {
  const tMedia = useTranslations('media');
  const locale = useLocale();
  const feedTitle = feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;
  const channelImages = feed.mappedFeed?.channel?.images;
  const imageCandidates = prependDistinctImageCandidate(
    feed.imageUrl,
    buildDTOChannelImageLoadCandidates(
      channelImages,
      IMAGES.LIST.LIVESTREAMS.DESKTOP.SIZE_FIND_TARGET,
      'lesser'
    )
  );
  const lastPubDate = feed.mappedFeed?.channel?.about?.last_pub_date ?? null;
  const mediumParam = getQueryParamFromQueueMediumId(
    feed.mappedFeed?.channel?.channel?.medium_id ?? null
  );
  const mediumSlug = mediumParam === 'music' ? 'music' : 'podcast';
  const url = `/add-by-rss/${mediumSlug}/livestream/${feed.idText}`;

  return (
    <div className={styles.row}>
      <ImagesPerView
        candidates={imageCandidates}
        alt={feedTitle || tMedia('livestream.livestream_image')}
        widthDesktop={IMAGES.LIST.LIVESTREAMS.DESKTOP.SIZE}
        heightDesktop={IMAGES.LIST.LIVESTREAMS.DESKTOP.SIZE}
        widthMobile={IMAGES.LIST.LIVESTREAMS.MOBILE.SIZE}
        heightMobile={IMAGES.LIST.LIVESTREAMS.MOBILE.SIZE}
        classNameDesktop={styles.image}
        classNameMobile={styles.imageMobile}
        href={url}
      />
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
