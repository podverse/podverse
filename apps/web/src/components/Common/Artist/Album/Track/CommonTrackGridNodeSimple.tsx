'use client';

import Link from 'next/link';
import React from 'react';

import { IMAGES } from '../../../../../constants/images';
import { Image } from '../../../../Image/Image';

import styles from '../../../../../styles/components/Common/List/ListGridNode.module.scss';

type CommonTrackGridNodeSimpleProps = {
  href: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
};

export const CommonTrackGridNodeSimple: React.FC<CommonTrackGridNodeSimpleProps> = ({
  href,
  title,
  subtitle,
  imageUrl,
}) => {
  return (
    <Link href={href} className={styles.link}>
      <div className={styles.gridNode}>
        <Image
          src={imageUrl ?? undefined}
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
