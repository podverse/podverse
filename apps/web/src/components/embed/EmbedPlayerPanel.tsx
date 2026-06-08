'use client';

import classNames from 'classnames';

import type { EmbedMediaType } from '../../lib/embed/embedTypes';
import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { EmbedInlineMediaMount } from './EmbedInlineMediaMount';
import { EmbedPlayerControls } from './EmbedPlayerControls';
import { EmbedPlayerInfo } from './EmbedPlayerInfo';
import { EmbedVideoPlaceholder } from './EmbedVideoPlaceholder';

import styles from '../../styles/components/embed/EmbedPlayerPanel.module.scss';

type EmbedPlayerPanelLayout = 'single' | 'list';

type EmbedPlayerPanelProps = {
  fallbackResource: EmbedSingleResourcePayload | null;
  headerTitle?: string | null;
  mediaType: EmbedMediaType;
  panelLayout: EmbedPlayerPanelLayout;
};

export function EmbedPlayerPanel({
  fallbackResource,
  headerTitle,
  mediaType,
  panelLayout,
}: EmbedPlayerPanelProps) {
  const isAudio = mediaType === 'audio';
  const playerRegionClassName = classNames(
    styles.playerRegion,
    panelLayout === 'single' ? styles.playerRegionSingle : styles.playerRegionList,
    !isAudio && styles.playerRegionVideo
  );

  return (
    <div className={playerRegionClassName} data-testid="embed-player-region">
      <EmbedPlayerInfo fallbackResource={fallbackResource} headerTitle={headerTitle} />
      {isAudio ? (
        <>
          <EmbedInlineMediaMount />
          <EmbedPlayerControls />
        </>
      ) : (
        <div className={styles.videoPlaceholder}>
          <EmbedVideoPlaceholder />
        </div>
      )}
    </div>
  );
}
