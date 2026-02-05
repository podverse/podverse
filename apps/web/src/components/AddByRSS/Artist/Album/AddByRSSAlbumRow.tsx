'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

import { Image } from '../../../Image/Image';
import { IMAGES } from '../../../../constants/images';
import styles from '../../../../styles/components/Common/List/Podcasts/ListPodcastRow.module.scss';
import type { AddByRSSFeedRecord } from '../../../../utils/addByRSS/types';

type AddByRSSAlbumRowProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSAlbumRow: React.FC<AddByRSSAlbumRowProps> = ({ feed }) => {
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const feedTitle = feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;
  const feedImageUrl = feed.imageUrl ?? feed.mappedFeed?.channel?.images?.[0]?.url ?? undefined;
  const author = feed.mappedFeed?.channel?.about?.author ?? null;
  const url = `/add-by-rss/album/${feed.idText}`;

  return (
    <Link href={url} className={styles.link}>
      <div className={styles.listItem}>
        <Image
          src={feedImageUrl}
          alt={feedTitle || tMedia('music.album_image')}
          width={IMAGES.LIST.ALBUMS.SIZE}
          height={IMAGES.LIST.ALBUMS.SIZE}
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
