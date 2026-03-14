'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import { formatDateAbbrev } from '@podverse/helpers';

import { IMAGES } from '../../../constants/images';
import { Image } from '../../Image/Image';
import type { PodcastListItem } from './types';

import styles from '../../../styles/components/Common/List/ListGridNode.module.scss';

type CommonPodcastListGridNodeProps = {
  item: PodcastListItem;
};

export const CommonPodcastListGridNode: React.FC<CommonPodcastListGridNodeProps> = ({ item }) => {
  const tMedia = useTranslations('media');
  const locale = useLocale();

  return (
    <Link href={item.href} className={styles.link}>
      <div className={styles.gridNode}>
        <Image
          src={item.imageUrl ?? undefined}
          alt={item.title || tMedia('podcast.podcast_image')}
          width={IMAGES.LIST.GRID.SIZE}
          height={IMAGES.LIST.GRID.SIZE}
          className={styles.image}
        />
        <div className={styles.title}>{item.title}</div>
        {item.lastPubDate && (
          <span className={styles.lastPubDate}>{formatDateAbbrev(item.lastPubDate, locale)}</span>
        )}
      </div>
    </Link>
  );
};
