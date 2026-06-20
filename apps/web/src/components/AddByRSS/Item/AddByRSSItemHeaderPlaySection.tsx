'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOItemEnclosure, EnclosureSelectedParams } from '@podverse/helpers';
import type { MoreButtonMenuItem } from '@podverse/ui';

import { ItemRowMoreActions } from '../../Media/ItemRowMoreActions';
import { PlayButtonLarge } from '../../MediaPlayer/Buttons/PlayButtonLarge';

import styles from '../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeaderPlaySection.module.scss';

type AddByRSSItemHeaderPlaySectionProps = {
  onPlay: () => void;
  /** When provided (e.g. episode/track detail), play button shows pause when this item is playing. */
  addByRSSIdText?: string;
  /** When empty or omitted, no more button is shown (e.g. add-by-RSS livestream: play/pause only). */
  moreButtonMenuItems?: MoreButtonMenuItem[];
  /** Item enclosures (DTO shape) used to show the audio/video modality icon. */
  enclosures?: DTOItemEnclosure[];
  itemTitle?: string | null;
  /** Provide when this item is NOT the now-playing item: selecting a source loads it (play). */
  onLoadInPlayerWithSource?: (params: EnclosureSelectedParams) => void;
};

export const AddByRSSItemHeaderPlaySection: React.FC<AddByRSSItemHeaderPlaySectionProps> = ({
  onPlay,
  addByRSSIdText,
  moreButtonMenuItems = [],
  enclosures = [],
  itemTitle,
  onLoadInPlayerWithSource,
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
          <ItemRowMoreActions
            enclosures={enclosures}
            itemTitle={itemTitle}
            ariaLabel={tMedia('more_options')}
            moreButtonMenuItems={moreButtonMenuItems}
            isLarge
            onLoadInPlayerWithSource={onLoadInPlayerWithSource}
          />
        </div>
      )}
    </div>
  );
};
