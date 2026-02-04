'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

import { Image } from '../../../../Image/Image';
import { IMAGES } from '../../../../../constants/images';
import styles from '../../../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodeRow.module.scss';
import type { AddByRSSFeedRecord } from '../../../../../utils/addByRSS/types';

type AddByRSSTrackRowProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSTrackRow: React.FC<AddByRSSTrackRowProps> = ({ feed }) => {
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const feedTitle = feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;
  const feedImageUrl = feed.imageUrl ?? feed.mappedFeed?.channel?.images?.[0]?.url ?? undefined;
  const author = feed.mappedFeed?.channel?.about?.author ?? null;
  const url = `/add-by-rss/track/${feed.idText}`;

  return (
    <div className={styles.trackRow}>
      <Link href={url} className={styles.trackClickable}>
        <Image
          src={feedImageUrl}
          alt={feedTitle || tMedia('music.track_image')}
          width={IMAGES.LIST.TRACKS.DESKTOP.SIZE}
          height={IMAGES.LIST.TRACKS.DESKTOP.SIZE}
          className={styles.image}
        />
        <Image
          src={feedImageUrl}
          alt={feedTitle || tMedia('music.track_image')}
          width={IMAGES.LIST.TRACKS.MOBILE.SIZE}
          height={IMAGES.LIST.TRACKS.MOBILE.SIZE}
          className={styles.imageMobile}
        />
        <div className={styles.trackWrapper}>
          <div className={styles.trackContent}>
            <div className={styles.trackTextWrapper}>
              <h3 className={styles.trackTitle}>{feedTitle}</h3>
              <div className={styles.trackArtist}>{author ?? tMisc('untitled')}</div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};
