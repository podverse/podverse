'use client';

import React from 'react';

import styles from '../../../styles/components/Common/Media/Podcast/PodcastHeaderViewTablet.module.scss';

type CommonPodcastHeaderViewTabletProps = {
  imageNode: React.ReactNode;
  titleNode: React.ReactNode;
  subtitleNode: React.ReactNode;
  buttonsNode: React.ReactNode;
};

export const CommonPodcastHeaderViewTablet: React.FC<CommonPodcastHeaderViewTabletProps> = ({
  imageNode,
  titleNode,
  subtitleNode,
  buttonsNode,
}) => {
  return (
    <div className={styles.contentTablet}>
      <div className={styles.topSection}>
        {imageNode}
        {titleNode}
      </div>
      <div className={styles.bottomSection}>
        <div className={styles.textSection}>
          {subtitleNode}
          {buttonsNode}
        </div>
      </div>
    </div>
  );
};
