'use client';

import React from 'react';

import styles from '../../../../styles/components/Common/Media/Podcast/PodcastHeader.module.scss';

type CommonAlbumHeaderProps = {
  desktop: React.ReactNode;
  tablet: React.ReactNode;
};

export const CommonAlbumHeader: React.FC<CommonAlbumHeaderProps> = ({ desktop, tablet }) => {
  return (
    <header className={styles.header}>
      {desktop}
      {tablet}
    </header>
  );
};
