'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { PodcastBatchByFeedGuidResponse } from '@podverse/helpers';
import {
  podcastIndexFeedListImageUrl,
  unparsedPodcastIndexFeedTarget,
} from '@podverse/helpers';
import { SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../../constants/images';
import { ROUTES } from '../../../../constants/routes';

import styles from '../../../../styles/components/Common/List/Podcasts/ListPodcastRow.module.scss';

interface Props {
  channelUnadded: PodcastBatchByFeedGuidResponse['feeds'][number];
}

export const ListAlbumRowRemoteItemUnadded: React.FC<Props> = ({ channelUnadded }) => {
  const target = unparsedPodcastIndexFeedTarget(channelUnadded);
  const imageSrc = podcastIndexFeedListImageUrl(channelUnadded);
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');

  const body = (
    <div className={styles.listItem}>
      <SkeletonFlashImage
        src={imageSrc ?? undefined}
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
  );

  if (target === null) {
    return body;
  }

  return (
    <Link href={`${ROUTES.PODCAST_INDEX}/feed/${target.podcastIndexId}`} className={styles.link}>
      {body}
    </Link>
  );
};
