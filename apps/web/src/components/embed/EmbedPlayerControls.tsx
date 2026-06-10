'use client';

import { useState } from 'react';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
// import { EmbedPlayerMoreButton } from './EmbedPlayerMoreButton';
import { PlayButton } from '../MediaPlayer/Buttons/PlayButton';
import { MediaPlayerProgress } from '../MediaPlayer/Sliders/MediaPlayerProgress';
import { EmbedAlternateEnclosureButton } from './EmbedAlternateEnclosureButton';
import { EmbedAlternateEnclosureModal } from './EmbedAlternateEnclosureModal';
import { EmbedPlaybackSpeedButton } from './EmbedPlaybackSpeedButton';

import styles from '../../styles/components/embed/EmbedPlayerControls.module.scss';

type EmbedPlayerControlsProps = {
  showChapterMarkers: boolean;
};

export function EmbedPlayerControls({ showChapterMarkers }: EmbedPlayerControlsProps) {
  const { mpItemLabeledItemEnclosures } = useMediaPlayer();
  const [isAlternateEnclosureModalOpen, setIsAlternateEnclosureModalOpen] = useState(false);
  const showAlternateEnclosureButton = mpItemLabeledItemEnclosures.length > 1;

  return (
    <>
      <div className={styles.controls} data-testid="embed-player-controls">
        <div className={styles.progressRow}>
          <MediaPlayerProgress layoutVariant="embed" showChapterMarkers={showChapterMarkers} />
        </div>
        <div className={styles.transportRow} data-testid="embed-player-transport">
          <PlayButton />
          {showAlternateEnclosureButton ? (
            <EmbedAlternateEnclosureButton
              onOpen={() => {
                setIsAlternateEnclosureModalOpen(true);
              }}
            />
          ) : null}
          <EmbedPlaybackSpeedButton />
          {/* <EmbedPlayerMoreButton /> */}
        </div>
      </div>
      <EmbedAlternateEnclosureModal
        isOpen={isAlternateEnclosureModalOpen}
        onClose={() => {
          setIsAlternateEnclosureModalOpen(false);
        }}
      />
    </>
  );
}
