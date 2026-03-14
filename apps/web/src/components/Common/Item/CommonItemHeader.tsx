'use client';

import React from 'react';

import { IMAGES } from '../../../constants/images';
import { Divider } from '../../Divider/Divider';
import { Image } from '../../Image/Image';

import styles from '../../../styles/components/Common/Item/CommonItemHeader.module.scss';
import headerStyles from '../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

type CommonItemHeaderProps = {
  titleNode: React.ReactNode;
  playSectionNode: React.ReactNode;
  imageUrl?: string | null;
  imageAlt?: string;
};

export const CommonItemHeader: React.FC<CommonItemHeaderProps> = ({
  titleNode,
  playSectionNode,
  imageUrl,
  imageAlt = '',
}) => {
  const content = (
    <>
      {titleNode}
      {playSectionNode}
    </>
  );

  const imageNode = imageUrl ? (
    <div className={styles.imageWrapper}>
      <Image
        src={imageUrl}
        alt={imageAlt}
        width={IMAGES.HEADER.MOBILE.SQUARE.SIZE}
        height={IMAGES.HEADER.MOBILE.SQUARE.SIZE}
        className={styles.imageMobile}
      />
      <Image
        src={imageUrl}
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
