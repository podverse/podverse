'use client';

import React from 'react';

import type { MoreButtonMenuItem } from '../../MoreButton/MoreButton';
import { MoreButton } from '../../MoreButton/MoreButton';
import { PlayButtonLarge } from '../../MediaPlayer/Buttons/PlayButtonLarge';
import styles from '../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeaderPlaySection.module.scss';

type AddByRSSItemHeaderPlaySectionProps = {
  onPlay: () => void;
  moreButtonMenuItems: MoreButtonMenuItem[];
};

export const AddByRSSItemHeaderPlaySection: React.FC<AddByRSSItemHeaderPlaySectionProps> = ({
  onPlay,
  moreButtonMenuItems,
}) => {
  return (
    <div className={styles.playSection}>
      <div className={styles.sectionStart}>
        <PlayButtonLarge onClick={onPlay} />
        <div className={styles.timeSection} />
      </div>
      <div className={styles.sectionEnd}>
        <MoreButton moreButtonMenuItems={moreButtonMenuItems} isLarge />
      </div>
    </div>
  );
};
