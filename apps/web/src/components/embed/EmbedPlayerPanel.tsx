'use client';

import type { EmbedMediaType } from '../../lib/embed/embedTypes';
import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { EmbedInlineMediaMount } from './EmbedInlineMediaMount';
import { EmbedPlayerControls } from './EmbedPlayerControls';
import { EmbedPlayerInfo } from './EmbedPlayerInfo';
import { EmbedVideoPlaceholder } from './EmbedVideoPlaceholder';

import styles from '../../styles/components/embed/EmbedPlayerPanel.module.scss';

type EmbedPlayerPanelProps = {
  fallbackResource: EmbedSingleResourcePayload | null;
  headerTitle?: string | null;
  mediaType: EmbedMediaType;
};

export function EmbedPlayerPanel({
  fallbackResource,
  headerTitle,
  mediaType,
}: EmbedPlayerPanelProps) {
  const isAudio = mediaType === 'audio';

  return (
    <div className={styles.playerRegion} data-testid="embed-player-region">
      <EmbedPlayerInfo fallbackResource={fallbackResource} headerTitle={headerTitle} />
      {isAudio ? (
        <>
          <EmbedInlineMediaMount />
          <EmbedPlayerControls />
        </>
      ) : (
        <EmbedVideoPlaceholder />
      )}
    </div>
  );
}
