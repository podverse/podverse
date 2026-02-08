'use client';

import React from 'react';

import type { MoreButtonMenuItem } from '../../MoreButton/MoreButton';
import { MoreButton } from '../../MoreButton/MoreButton';
import { PlayButtonLarge } from '../../MediaPlayer/Buttons/PlayButtonLarge';
import styles from '../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeaderPlaySection.module.scss';

type AddByRSSItemHeaderPlaySectionProps = {
  onPlay: () => void;
  /** When empty or omitted, no more button is shown (e.g. add-by-RSS livestream: play/pause only). */
  moreButtonMenuItems?: MoreButtonMenuItem[];
};

export const AddByRSSItemHeaderPlaySection: React.FC<AddByRSSItemHeaderPlaySectionProps> = ({
  onPlay,
  moreButtonMenuItems = [],
}) => {
  return (
    <div className={styles.playSection}>
      <div className={styles.sectionStart}>
        <PlayButtonLarge onClick={onPlay} />
        <div className={styles.timeSection} />
      </div>
      {moreButtonMenuItems.length > 0 && (
        <div className={styles.sectionEnd}>
          <MoreButton moreButtonMenuItems={moreButtonMenuItems} isLarge />
        </div>
      )}
    </div>
  );
};
