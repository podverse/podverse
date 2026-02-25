'use client';

import React from 'react';

import styles from '../../../styles/components/Common/Media/Podcast/PodcastHeaderViewTablet.module.scss';

type CommonArtistHeaderViewTabletProps = {
  imageNode: React.ReactNode;
  titleNode: React.ReactNode;
  subtitleNode: React.ReactNode;
  buttonsNode: React.ReactNode;
};

export const CommonArtistHeaderViewTablet: React.FC<CommonArtistHeaderViewTabletProps> = ({
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
