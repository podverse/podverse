'use client';

import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { EmbedPlayerInfo } from './EmbedPlayerInfo';

import styles from '../../styles/components/embed/EmbedTallInfoOverlay.module.scss';

type EmbedTallInfoOverlayProps = {
  fallbackResource: EmbedSingleResourcePayload | null;
  headerTitle?: string | null;
};

export function EmbedTallInfoOverlay({
  fallbackResource,
  headerTitle,
}: EmbedTallInfoOverlayProps) {
  return (
    <div className={styles.overlayTop} onClick={(event) => event.stopPropagation()}>
      <EmbedPlayerInfo
        fallbackResource={fallbackResource}
        headerTitle={headerTitle}
        preferItemTitle={true}
        variant="overlay"
      />
    </div>
  );
}
