'use client';

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import type { DTOChannel } from '@podverse/helpers';
import { buildDTOChannelImageHeroLoadCandidates } from '@podverse/helpers';
import { ImageLightboxModal, SkeletonFlashImage } from '@podverse/ui';

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
  const tMisc = useTranslations('misc');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const candidatesMobile = buildDTOChannelImageHeroLoadCandidates(
    channel.channel_images,
    IMAGES.HEADER.MOBILE.SQUARE.SIZE_FIND_TARGET,
    'greater'
  );
  const candidatesTablet = buildDTOChannelImageHeroLoadCandidates(
    channel.channel_images,
    IMAGES.HEADER.TABLET.SQUARE.SIZE_FIND_TARGET,
    'greater'
  );
  const candidatesDesktop = buildDTOChannelImageHeroLoadCandidates(
    channel.channel_images,
    IMAGES.HEADER.DESKTOP.SQUARE.SIZE_FIND_TARGET,
    'greater'
  );
  const lightboxCandidates = buildDTOChannelImageHeroLoadCandidates(
    channel.channel_images,
    'largest',
    'greater'
  );

  return (
    <>
      <button
        aria-label={tMisc('image_preview_dialog')}
        className={styles.headerImageClickable}
        type="button"
        onClick={() => setLightboxOpen(true)}
      >
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
      </button>
      <ImageLightboxModal
        alt={alt}
        ariaLabel={tMisc('image_preview_dialog')}
        candidates={lightboxCandidates}
        closeButtonAriaLabel={tMisc('close_modal')}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};
