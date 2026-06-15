'use client';

import type { ReactNode } from 'react';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { PlayButton } from '../MediaPlayer/Buttons/PlayButton';
import { MediaPlayerProgress } from '../MediaPlayer/Sliders/MediaPlayerProgress';
import { EmbedAlternateEnclosureButton } from './EmbedAlternateEnclosureButton';
import { EmbedPlayerMoreButton } from './EmbedPlayerMoreButton';
import { EmbedPlayerTime } from './EmbedPlayerTime';

import styles from '../../styles/components/embed/EmbedPlayerControls.module.scss';

type EmbedPlayerControlsProps = {
  onOpenAlternateEnclosureModal: () => void;
  showChapterMarkers: boolean;
  showChapterHoverTooltip?: boolean;
  muteControl?: ReactNode;
};

export function EmbedPlayerControls({
  onOpenAlternateEnclosureModal,
  showChapterMarkers,
  showChapterHoverTooltip,
  muteControl,
}: EmbedPlayerControlsProps) {
  const { mpItemLabeledItemEnclosures } = useMediaPlayer();
  const showAlternateEnclosureButton = mpItemLabeledItemEnclosures.length > 1;

  return (
    <>
      <div className={styles.controls} data-testid="embed-player-controls">
        <div className={styles.progressRow}>
          <MediaPlayerProgress
            layoutVariant="embed"
            showChapterHoverTooltip={showChapterHoverTooltip}
            showChapterMarkers={showChapterMarkers}
          />
        </div>
        <EmbedPlayerTime />
        <div className={styles.actionsRow} data-testid="embed-player-transport">
          {showAlternateEnclosureButton ? (
            <EmbedAlternateEnclosureButton onOpen={onOpenAlternateEnclosureModal} />
          ) : null}
          {muteControl ?? null}
          <EmbedPlayerMoreButton />
        </div>
        <div className={styles.playButtonCell} data-testid="embed-player-play-button-cell">
          <PlayButton />
        </div>
      </div>
    </>
  );
}
