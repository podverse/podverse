'use client';

import Link from 'next/link';
import React from 'react';

import { ImagesPerView } from '../../../../Image/ImagesPerView';
import { IMAGES } from '../../../../../constants/images';
import styles from '../../../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodeRow.module.scss';

type CommonTrackRowProps = {
  href: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  leftMetaNode?: React.ReactNode;
  rightMetaNode?: React.ReactNode;
};

export const CommonTrackRow: React.FC<CommonTrackRowProps> = ({
  href,
  title,
  subtitle,
  imageUrl,
  leftMetaNode,
  rightMetaNode,
}) => {
  return (
    <div className={styles.trackRow}>
      <Link href={href} className={styles.trackClickable}>
        <ImagesPerView
          src={imageUrl ?? undefined}
          alt={title}
          widthDesktop={IMAGES.LIST.TRACKS.DESKTOP.SIZE}
          heightDesktop={IMAGES.LIST.TRACKS.DESKTOP.SIZE}
          widthMobile={IMAGES.LIST.TRACKS.MOBILE.SIZE}
          heightMobile={IMAGES.LIST.TRACKS.MOBILE.SIZE}
          classNameDesktop={styles.image}
          classNameMobile={styles.imageMobile}
        />
        <div className={styles.trackWrapper}>
          <div className={styles.trackContent}>
            <div className={styles.trackTextWrapper}>
              <h3 className={styles.trackTitle}>{title}</h3>
              {subtitle ? <div className={styles.trackArtist}>{subtitle}</div> : null}
            </div>
          </div>
        </div>
      </Link>
      {(leftMetaNode || rightMetaNode) && (
        <div className={styles.bottomSection}>
          <div className={styles.bottomSectionStart}>{leftMetaNode}</div>
          <div className={styles.bottomSectionEnd}>{rightMetaNode}</div>
        </div>
      )}
    </div>
  );
};
