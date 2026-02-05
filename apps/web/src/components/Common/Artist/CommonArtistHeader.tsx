'use client';

import React from 'react';

import styles from '../../../styles/components/Common/Media/Podcast/PodcastHeader.module.scss';

type CommonArtistHeaderProps = {
  desktop: React.ReactNode;
  tablet: React.ReactNode;
};

export const CommonArtistHeader: React.FC<CommonArtistHeaderProps> = ({ desktop, tablet }) => {
  return (
    <header className={styles.header}>
      {desktop}
      {tablet}
    </header>
  );
};
