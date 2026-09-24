'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { PodcastBatchByFeedGuidResponse } from '@podverse/helpers';
import { podcastIndexFeedListImageUrl, unparsedPodcastIndexFeedTarget } from '@podverse/helpers';
import { SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../../constants/images';
import { ROUTES } from '../../../../constants/routes';

import styles from '../../../../styles/components/Common/List/ListGridNode.module.scss';

interface Props {
  channelUnadded: PodcastBatchByFeedGuidResponse['feeds'][number];
}

export const ListAlbumGridNodeUnadded: React.FC<Props> = ({ channelUnadded }) => {
  const target = unparsedPodcastIndexFeedTarget(channelUnadded);
  const imageSrc = podcastIndexFeedListImageUrl(channelUnadded);
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');

  const body = (
    <div className={styles.gridNode}>
      <SkeletonFlashImage
        src={imageSrc ?? undefined}
        alt={channelUnadded.title || tMedia('music.album_image')}
        width={IMAGES.LIST.GRID.SIZE}
        height={IMAGES.LIST.GRID.SIZE}
        className={styles.image}
      />
      <div className={styles.title}>{channelUnadded.title}</div>
      {channelUnadded.author && (
        <span className={styles.lastPubDate}>{channelUnadded.author || tMisc('untitled')}</span>
      )}
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
