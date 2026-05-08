'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import { formatDateAbbrev } from '@podverse/helpers';
import { SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../constants/images';
import { listItemImageCandidates } from '../../../utils/image/listItemImageCandidates';
import type { PodcastListItem } from './types';

import styles from '../../../styles/components/Common/List/Podcasts/ListPodcastRow.module.scss';

type CommonPodcastListRowProps = {
  item: PodcastListItem;
};

export const CommonPodcastListRow: React.FC<CommonPodcastListRowProps> = ({ item }) => {
  const tMedia = useTranslations('media');
  const locale = useLocale();

  return (
    <Link href={item.href} className={styles.link}>
      <div className={styles.listItem}>
        <SkeletonFlashImage
          candidates={listItemImageCandidates(item)}
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
