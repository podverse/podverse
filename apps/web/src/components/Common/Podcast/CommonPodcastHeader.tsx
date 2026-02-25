'use client';

import React from 'react';

import styles from '../../../styles/components/Common/Media/Podcast/PodcastHeader.module.scss';

type CommonPodcastHeaderProps = {
  desktop: React.ReactNode;
  tablet: React.ReactNode;
};

export const CommonPodcastHeader: React.FC<CommonPodcastHeaderProps> = ({ desktop, tablet }) => {
  return (
    <header className={styles.header}>
      {desktop}
      {tablet}
    </header>
  );
};
