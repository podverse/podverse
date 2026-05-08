'use client';

import React from 'react';

import type { DTOChannel } from '@podverse/helpers';
import { buildDTOChannelImageLoadCandidates } from '@podverse/helpers';
import { SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../constants/images';

import styles from '../../../styles/components/Common/Media/Podcast/PodcastHeaderImage.module.scss';

type CommonChannelHeaderImageProps = {
  channel: DTOChannel;
  alt: string;
};

export const CommonChannelHeaderImage: React.FC<CommonChannelHeaderImageProps> = ({
  channel,
  alt,
}) => {
  const candidatesMobile = buildDTOChannelImageLoadCandidates(
    channel.channel_images,
    IMAGES.HEADER.MOBILE.SQUARE.SIZE_FIND_TARGET,
    'greater'
  );
  const candidatesTablet = buildDTOChannelImageLoadCandidates(
    channel.channel_images,
    IMAGES.HEADER.TABLET.SQUARE.SIZE_FIND_TARGET,
    'greater'
  );
  const candidatesDesktop = buildDTOChannelImageLoadCandidates(
    channel.channel_images,
    IMAGES.HEADER.DESKTOP.SQUARE.SIZE_FIND_TARGET,
    'greater'
  );

  return (
    <div className={styles.headerImageWrapper}>
      <SkeletonFlashImage
        candidates={candidatesMobile}
        alt={alt}
        width={IMAGES.HEADER.MOBILE.SQUARE.SIZE}
        height={IMAGES.HEADER.MOBILE.SQUARE.SIZE}
        className={styles.mobile}
      />
      <SkeletonFlashImage
        candidates={candidatesTablet}
        alt={alt}
        width={IMAGES.HEADER.TABLET.SQUARE.SIZE}
        height={IMAGES.HEADER.TABLET.SQUARE.SIZE}
        className={styles.tablet}
      />
      <SkeletonFlashImage
        candidates={candidatesDesktop}
        alt={alt}
        width={IMAGES.HEADER.DESKTOP.SQUARE.SIZE}
        height={IMAGES.HEADER.DESKTOP.SQUARE.SIZE}
        className={styles.desktop}
      />
    </div>
  );
};
