'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { MoreButtonMenuItem } from '@podverse/ui';
import { MoreButton } from '@podverse/ui';

import { PlayButtonLarge } from '../../MediaPlayer/Buttons/PlayButtonLarge';

import styles from '../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeaderPlaySection.module.scss';

type AddByRSSItemHeaderPlaySectionProps = {
  onPlay: () => void;
  /** When provided (e.g. episode/track detail), play button shows pause when this item is playing. */
  addByRSSIdText?: string;
  /** When empty or omitted, no more button is shown (e.g. add-by-RSS livestream: play/pause only). */
  moreButtonMenuItems?: MoreButtonMenuItem[];
};

export const AddByRSSItemHeaderPlaySection: React.FC<AddByRSSItemHeaderPlaySectionProps> = ({
  onPlay,
  addByRSSIdText,
  moreButtonMenuItems = [],
}) => {
  const tMedia = useTranslations('media');

  return (
    <div className={styles.playSection}>
      <div className={styles.sectionStart}>
        <PlayButtonLarge addByRSSIdText={addByRSSIdText} onClick={onPlay} />
        <div className={styles.timeSection} />
      </div>
      {moreButtonMenuItems.length > 0 && (
        <div className={styles.sectionEnd}>
          <MoreButton
            ariaLabel={tMedia('more_options')}
            moreButtonMenuItems={moreButtonMenuItems}
            isLarge
          />
        </div>
      )}
    </div>
  );
};
