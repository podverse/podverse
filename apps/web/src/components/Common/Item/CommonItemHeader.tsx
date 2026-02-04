'use client';

import React from 'react';

import { Divider } from '../../Divider/Divider';
import styles from '../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

type CommonItemHeaderProps = {
  titleNode: React.ReactNode;
  playSectionNode: React.ReactNode;
};

export const CommonItemHeader: React.FC<CommonItemHeaderProps> = ({
  titleNode,
  playSectionNode,
}) => {
  return (
    <header>
      {titleNode}
      {playSectionNode}
      <Divider className={styles.divider} />
    </header>
  );
};
