'use client';

import Link from 'next/link';
import React from 'react';

import { SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../../../constants/images';

import styles from '../../../../../styles/components/Common/List/ListGridNode.module.scss';

type CommonTrackGridNodeSimpleProps = {
  href: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  imageCandidates?: string[];
};

export const CommonTrackGridNodeSimple: React.FC<CommonTrackGridNodeSimpleProps> = ({
  href,
  title,
  subtitle,
  imageUrl,
  imageCandidates,
}) => {
  const resolvedCandidates =
    imageCandidates !== undefined
      ? imageCandidates
      : imageUrl !== null && imageUrl !== undefined && imageUrl.trim() !== ''
        ? [imageUrl.trim()]
        : [];

  return (
    <Link href={href} className={styles.link}>
      <div className={styles.gridNode}>
        <SkeletonFlashImage
          candidates={resolvedCandidates}
          alt={title}
          width={IMAGES.LIST.GRID.SIZE}
          height={IMAGES.LIST.GRID.SIZE}
          className={styles.image}
        />
        <div className={styles.title}>{title}</div>
        {subtitle ? <span className={styles.lastPubDate}>{subtitle}</span> : null}
      </div>
    </Link>
  );
};
