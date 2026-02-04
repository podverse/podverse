'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

import { Image } from '../../Image/Image';
import { IMAGES } from '../../../constants/images';
import styles from '../../../styles/components/Common/List/Podcasts/ListPodcastRow.module.scss';
import type { AddByRSSFeedRecord } from '../../../utils/addByRSS/types';

type AddByRSSArtistRowProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSArtistRow: React.FC<AddByRSSArtistRowProps> = ({ feed }) => {
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const feedTitle = feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;
  const feedImageUrl = feed.imageUrl ?? feed.mappedFeed?.channel?.images?.[0]?.url ?? undefined;
  const author = feed.mappedFeed?.channel?.about?.author ?? null;
  const url = `/add-by-rss/artist/${feed.idText}`;

  return (
    <Link href={url} className={styles.link}>
      <div className={styles.listItem}>
        <Image
          src={feedImageUrl}
          alt={feedTitle || tMedia('music.artist_image')}
          width={IMAGES.LIST.ARTISTS.SIZE}
          height={IMAGES.LIST.ARTISTS.SIZE}
          className={styles.image}
        />
        <div className={styles.content}>
          <h3 className={styles.title}>{feedTitle}</h3>
          <span className={styles.lastPubDate}>{author ?? tMisc('untitled')}</span>
        </div>
      </div>
    </Link>
  );
};
