'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import { IMAGES } from '../../../../constants/images';
import { listItemImageCandidates } from '../../../../utils/image/listItemImageCandidates';
import { Image } from '../../../Image/Image';
import type { AlbumListItem } from './types';

import styles from '../../../../styles/components/Common/List/ListGridNode.module.scss';

type CommonAlbumListGridNodeProps = {
  item: AlbumListItem;
};

export const CommonAlbumListGridNode: React.FC<CommonAlbumListGridNodeProps> = ({ item }) => {
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const showSubtitle = Boolean(item.subtitle);

  return (
    <Link href={item.href} className={styles.link}>
      <div className={styles.gridNode}>
        <Image
          candidates={listItemImageCandidates(item)}
          alt={item.title || tMedia('music.album_image')}
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
