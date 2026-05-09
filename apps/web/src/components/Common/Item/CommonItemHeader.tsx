'use client';

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { Divider, ImageLightboxModal, SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../constants/images';

import styles from '../../../styles/components/Common/Item/CommonItemHeader.module.scss';
import headerStyles from '../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

type CommonItemHeaderProps = {
  titleNode: React.ReactNode;
  playSectionNode: React.ReactNode;
  imageCandidates?: string[];
  /** When set, used for full-size preview URLs; defaults to `imageCandidates`. */
  imageLightboxCandidates?: string[];
  imageAlt?: string;
};

export const CommonItemHeader: React.FC<CommonItemHeaderProps> = ({
  titleNode,
  playSectionNode,
  imageCandidates = [],
  imageLightboxCandidates,
  imageAlt = '',
}) => {
  const tMisc = useTranslations('misc');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const content = (
    <>
      {titleNode}
      {playSectionNode}
    </>
  );

  const resolvedCandidates = imageCandidates;
  const resolvedLightboxCandidates =
    imageLightboxCandidates !== undefined && imageLightboxCandidates.length > 0
      ? imageLightboxCandidates
      : resolvedCandidates;

  const imageButton =
    resolvedCandidates.length > 0 ? (
      <button
        aria-label={tMisc('image_preview_dialog')}
        className={styles.imageClickable}
        type="button"
        onClick={() => setLightboxOpen(true)}
      >
        <div className={styles.imageWrapper}>
          <SkeletonFlashImage
            candidates={resolvedCandidates}
            alt={imageAlt}
            width={IMAGES.HEADER.MOBILE.SQUARE.SIZE}
            height={IMAGES.HEADER.MOBILE.SQUARE.SIZE}
            className={styles.imageMobile}
          />
          <SkeletonFlashImage
            candidates={resolvedCandidates}
            alt={imageAlt}
            width={IMAGES.HEADER.DESKTOP.SQUARE.SIZE}
            height={IMAGES.HEADER.DESKTOP.SQUARE.SIZE}
            className={styles.imageDesktop}
          />
        </div>
      </button>
    ) : null;

  return (
    <header>
      {imageButton ? (
        <>
          <div className={styles.wrapper}>
            {imageButton}
            <div className={styles.contentSection}>{content}</div>
          </div>
          <ImageLightboxModal
            alt={imageAlt}
            ariaLabel={tMisc('image_preview_dialog')}
            candidates={resolvedLightboxCandidates}
            closeButtonAriaLabel={tMisc('close_modal')}
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
          />
          <Divider className={styles.divider} />
        </>
      ) : (
        <>
          {content}
          <Divider className={headerStyles.divider} />
        </>
      )}
    </header>
  );
};
