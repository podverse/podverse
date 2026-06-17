'use client';

import { EmbedPlayerControls } from './EmbedPlayerControls';
import { EmbedResponsiveMuteControl } from './EmbedResponsiveMuteControl';

import styles from '../../styles/components/embed/EmbedResponsiveControlsOverlay.module.scss';

type EmbedResponsiveControlsOverlayProps = {
  onOpenAlternateEnclosureModal: () => void;
  showChapterMarkers: boolean;
};

export function EmbedResponsiveControlsOverlay({
  onOpenAlternateEnclosureModal,
  showChapterMarkers,
}: EmbedResponsiveControlsOverlayProps) {
  return (
    <div className={styles.overlayBottom} onClick={(event) => event.stopPropagation()}>
      <div className={styles.controlsRow}>
        <EmbedPlayerControls
          muteControl={<EmbedResponsiveMuteControl />}
          onOpenAlternateEnclosureModal={onOpenAlternateEnclosureModal}
          showChapterHoverTooltip={true}
          showChapterMarkers={showChapterMarkers}
        />
      </div>
    </div>
  );
}
