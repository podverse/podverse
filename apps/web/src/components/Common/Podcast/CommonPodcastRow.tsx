'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

import { formatDateAbbrev } from '@podverse/helpers';

import { Image } from '../../Image/Image';
import { IMAGES } from '../../../constants/images';
import styles from '../../../styles/components/Common/List/Podcasts/ListPodcastRow.module.scss';
import type { PodcastListItem } from './types';

type CommonPodcastListRowProps = {
  item: PodcastListItem;
};

export const CommonPodcastListRow: React.FC<CommonPodcastListRowProps> = ({ item }) => {
  const tMedia = useTranslations('media');
  const locale = useLocale();

  return (
    <Link href={item.href} className={styles.link}>
      <div className={styles.listItem}>
        <Image
          src={item.imageUrl ?? undefined}
          alt={item.title || tMedia('podcast.podcast_image')}
          width={IMAGES.LIST.PODCASTS.SIZE}
          height={IMAGES.LIST.PODCASTS.SIZE}
          className={styles.image}
        />
        <div className={styles.content}>
          <h3 className={styles.title}>{item.title}</h3>
          {item.lastPubDate && (
            <span className={styles.lastPubDate}>{formatDateAbbrev(item.lastPubDate, locale)}</span>
          )}
        </div>
      </div>
    </Link>
  );
};
