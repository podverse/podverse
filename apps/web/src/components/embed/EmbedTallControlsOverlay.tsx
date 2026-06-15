'use client';

import { EmbedPlayerControls } from './EmbedPlayerControls';
import { EmbedTallMuteControl } from './EmbedTallMuteControl';

import styles from '../../styles/components/embed/EmbedTallControlsOverlay.module.scss';

type EmbedTallControlsOverlayProps = {
  onOpenAlternateEnclosureModal: () => void;
  showChapterMarkers: boolean;
};

export function EmbedTallControlsOverlay({
  onOpenAlternateEnclosureModal,
  showChapterMarkers,
}: EmbedTallControlsOverlayProps) {
  return (
    <div className={styles.overlayBottom} onClick={(event) => event.stopPropagation()}>
      <div className={styles.controlsRow}>
        <EmbedPlayerControls
          muteControl={<EmbedTallMuteControl />}
          onOpenAlternateEnclosureModal={onOpenAlternateEnclosureModal}
          showChapterHoverTooltip={true}
          showChapterMarkers={showChapterMarkers}
        />
      </div>
    </div>
  );
}
