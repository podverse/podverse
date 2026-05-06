'use client';

import React from 'react';

import { Divider } from '@podverse/ui';

import { IMAGES } from '../../../constants/images';
import { Image } from '../../Image/Image';

import styles from '../../../styles/components/Common/Item/CommonItemHeader.module.scss';
import headerStyles from '../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

type CommonItemHeaderProps = {
  titleNode: React.ReactNode;
  playSectionNode: React.ReactNode;
  imageCandidates?: string[];
  imageAlt?: string;
};

export const CommonItemHeader: React.FC<CommonItemHeaderProps> = ({
  titleNode,
  playSectionNode,
  imageCandidates = [],
  imageAlt = '',
}) => {
  const content = (
    <>
      {titleNode}
      {playSectionNode}
    </>
  );

  const resolvedCandidates = imageCandidates;

  const imageNode =
    resolvedCandidates.length > 0 ? (
      <div className={styles.imageWrapper}>
        <Image
          candidates={resolvedCandidates}
          alt={imageAlt}
          width={IMAGES.HEADER.MOBILE.SQUARE.SIZE}
          height={IMAGES.HEADER.MOBILE.SQUARE.SIZE}
          className={styles.imageMobile}
        />
        <Image
          candidates={resolvedCandidates}
          alt={imageAlt}
          width={IMAGES.HEADER.DESKTOP.SQUARE.SIZE}
          height={IMAGES.HEADER.DESKTOP.SQUARE.SIZE}
          className={styles.imageDesktop}
        />
      </div>
    ) : null;

  return (
    <header>
      {imageNode ? (
        <>
          <div className={styles.wrapper}>
            {imageNode}
            <div className={styles.contentSection}>{content}</div>
          </div>
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
