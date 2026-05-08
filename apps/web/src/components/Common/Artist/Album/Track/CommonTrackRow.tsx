'use client';

import Link from 'next/link';
import React from 'react';

import { Button, ImagesPerView } from '@podverse/ui';

import { IMAGES } from '../../../../../constants/images';

import styles from '../../../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodeRow.module.scss';

type CommonTrackRowProps = {
  /** When provided, row click triggers play (track behavior). When omitted, href is used to navigate (e.g. feed row). */
  href?: string;
  /** When provided, main area is a button that calls this on click (play track). Use for track rows. */
  onClick?: () => void;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  leftMetaNode?: React.ReactNode;
  rightMetaNode?: React.ReactNode;
};

const trackContent = (
  title: string,
  subtitle: string | null | undefined,
  imageUrl: string | null | undefined
) => (
  <>
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
  </>
);

export const CommonTrackRow: React.FC<CommonTrackRowProps> = ({
  href,
  onClick,
  title,
  subtitle,
  imageUrl,
  leftMetaNode,
  rightMetaNode,
}) => {
  const content = trackContent(title, subtitle, imageUrl);

  return (
    <div className={styles.trackRow}>
      {onClick ? (
        <Button variant="unstyled" onClick={onClick} className={styles.trackClickable}>
          {content}
        </Button>
      ) : href ? (
        <Link href={href} className={styles.trackClickable}>
          {content}
        </Link>
      ) : null}
      {(leftMetaNode || rightMetaNode) && (
        <div className={styles.bottomSection}>
          <div className={styles.bottomSectionStart}>{leftMetaNode}</div>
          <div className={styles.bottomSectionEnd}>{rightMetaNode}</div>
        </div>
      )}
    </div>
  );
};
