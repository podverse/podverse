'use client';

import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { EmbedPlayerInfo } from './EmbedPlayerInfo';

import styles from '../../styles/components/embed/EmbedResponsiveInfoOverlay.module.scss';

type EmbedResponsiveInfoOverlayProps = {
  fallbackResource: EmbedSingleResourcePayload | null;
  headerTitle?: string | null;
};

export function EmbedResponsiveInfoOverlay({
  fallbackResource,
  headerTitle,
}: EmbedResponsiveInfoOverlayProps) {
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
