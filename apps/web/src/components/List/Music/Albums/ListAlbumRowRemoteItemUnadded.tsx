'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { PodcastBatchByFeedGuidResponse } from '@podverse/helpers';

import { IMAGES } from '../../../../constants/images';
import { ROUTES } from '../../../../constants/routes';
import { SkeletonFlashImage } from '../../../Image/SkeletonFlashImage';

import styles from '../../../../styles/components/Common/List/Podcasts/ListPodcastRow.module.scss';

interface Props {
  channelUnadded: PodcastBatchByFeedGuidResponse['feeds'][number];
}

export const ListAlbumRowRemoteItemUnadded: React.FC<Props> = ({ channelUnadded }) => {
  const url = `${ROUTES.PODCAST_INDEX}/feed/${channelUnadded.id}`;
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');

  return (
    <Link href={url} className={styles.link}>
      <div className={styles.listItem}>
        <SkeletonFlashImage
          src={channelUnadded.image}
          alt={channelUnadded.title || tMedia('music.album_image')}
          width={IMAGES.LIST.ALBUMS.SIZE}
          height={IMAGES.LIST.ALBUMS.SIZE}
          className={styles.image}
        />
        <div className={styles.content}>
          <h3 className={styles.title}>{channelUnadded.title}</h3>
          {channelUnadded.author && (
            <span className={styles.lastPubDate}>{channelUnadded.author || tMisc('untitled')}</span>
          )}
        </div>
      </div>
    </Link>
  );
};
