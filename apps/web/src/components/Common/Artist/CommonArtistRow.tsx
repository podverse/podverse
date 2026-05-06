'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import { IMAGES } from '../../../constants/images';
import { listItemImageCandidates } from '../../../utils/image/listItemImageCandidates';
import { Image } from '../../Image/Image';
import type { ArtistListItem } from './types';

import styles from '../../../styles/components/Common/List/Podcasts/ListPodcastRow.module.scss';

type CommonArtistListRowProps = {
  item: ArtistListItem;
};

export const CommonArtistListRow: React.FC<CommonArtistListRowProps> = ({ item }) => {
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const showSubtitle = item.showSubtitle ?? Boolean(item.subtitle);

  return (
    <Link href={item.href} className={styles.link}>
      <div className={styles.listItem}>
        <Image
          candidates={listItemImageCandidates(item)}
          alt={item.title || tMedia('music.artist_image')}
          width={IMAGES.LIST.ARTISTS.SIZE}
          height={IMAGES.LIST.ARTISTS.SIZE}
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
