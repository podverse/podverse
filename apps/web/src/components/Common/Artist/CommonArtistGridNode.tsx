'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

import { Image } from '../../Image/Image';
import { IMAGES } from '../../../constants/images';
import styles from '../../../styles/components/Common/List/ListGridNode.module.scss';
import type { ArtistListItem } from './types';

type CommonArtistListGridNodeProps = {
  item: ArtistListItem;
};

export const CommonArtistListGridNode: React.FC<CommonArtistListGridNodeProps> = ({ item }) => {
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const showSubtitle = item.showSubtitle ?? Boolean(item.subtitle);

  return (
    <Link href={item.href} className={styles.link}>
      <div className={styles.gridNode}>
        <Image
          src={item.imageUrl ?? undefined}
          alt={item.title || tMedia('music.artist_image')}
          width={IMAGES.LIST.GRID.SIZE}
          height={IMAGES.LIST.GRID.SIZE}
          className={styles.image}
        />
        <div className={styles.title}>{item.title}</div>
        {showSubtitle && (
          <span className={styles.lastPubDate}>{item.subtitle || tMisc('untitled')}</span>
        )}
      </div>
    </Link>
  );
};
