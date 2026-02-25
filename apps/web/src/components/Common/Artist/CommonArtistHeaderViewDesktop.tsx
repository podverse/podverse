'use client';

import React from 'react';

import styles from '../../../styles/components/Common/Media/Podcast/PodcastHeaderViewDesktop.module.scss';

type CommonArtistHeaderViewDesktopProps = {
  imageNode: React.ReactNode;
  titleNode: React.ReactNode;
  subtitleNode: React.ReactNode;
  buttonsNode: React.ReactNode;
};

export const CommonArtistHeaderViewDesktop: React.FC<CommonArtistHeaderViewDesktopProps> = ({
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
