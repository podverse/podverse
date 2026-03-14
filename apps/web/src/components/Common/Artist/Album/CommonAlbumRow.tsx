'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import { IMAGES } from '../../../../constants/images';
import { Image } from '../../../Image/Image';
import type { AlbumListItem } from './types';

import styles from '../../../../styles/components/Common/List/Podcasts/ListPodcastRow.module.scss';

type CommonAlbumListRowProps = {
  item: AlbumListItem;
};

export const CommonAlbumListRow: React.FC<CommonAlbumListRowProps> = ({ item }) => {
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const showSubtitle = Boolean(item.subtitle);

  return (
    <Link href={item.href} className={styles.link}>
      <div className={styles.listItem}>
        <Image
          src={item.imageUrl ?? undefined}
          alt={item.title || tMedia('music.album_image')}
          width={IMAGES.LIST.ALBUMS.SIZE}
          height={IMAGES.LIST.ALBUMS.SIZE}
          className={styles.image}
        />
        <div className={styles.content}>
          <h3 className={styles.title}>{item.title}</h3>
          {showSubtitle && (
            <span className={styles.lastPubDate}>{item.subtitle || tMisc('untitled')}</span>
          )}
        </div>
      </div>
    </Link>
  );
};
