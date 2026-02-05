'use client';

import React from 'react';

import styles from '../../../styles/components/Common/Media/Podcast/PodcastHeaderViewDesktop.module.scss';

type CommonPodcastHeaderViewDesktopProps = {
  imageNode: React.ReactNode;
  titleNode: React.ReactNode;
  subtitleNode: React.ReactNode;
  buttonsNode: React.ReactNode;
};

export const CommonPodcastHeaderViewDesktop: React.FC<CommonPodcastHeaderViewDesktopProps> = ({
  imageNode,
  titleNode,
  subtitleNode,
  buttonsNode,
}) => {
  return (
    <div className={styles.contentDesktop}>
      {imageNode}
      <div className={styles.textSection}>
        {titleNode}
        <div className={styles.bottomSection}>
          {subtitleNode}
          {buttonsNode}
        </div>
      </div>
    </div>
  );
};
