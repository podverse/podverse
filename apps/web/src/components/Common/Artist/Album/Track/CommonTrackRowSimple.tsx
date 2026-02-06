'use client';

import Link from 'next/link';
import React from 'react';

import { Image } from '../../../../Image/Image';
import { IMAGES } from '../../../../../constants/images';
import styles from '../../../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodeRow.module.scss';

type CommonTrackRowSimpleProps = {
  href: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  leftMetaNode?: React.ReactNode;
  rightMetaNode?: React.ReactNode;
};

export const CommonTrackRowSimple: React.FC<CommonTrackRowSimpleProps> = ({
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
        <Image
          src={imageUrl ?? undefined}
          alt={title}
          width={IMAGES.LIST.TRACKS.DESKTOP.SIZE}
          height={IMAGES.LIST.TRACKS.DESKTOP.SIZE}
          className={styles.image}
        />
        <Image
          src={imageUrl ?? undefined}
          alt={title}
          width={IMAGES.LIST.TRACKS.MOBILE.SIZE}
          height={IMAGES.LIST.TRACKS.MOBILE.SIZE}
          className={styles.imageMobile}
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
