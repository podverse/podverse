'use client';

import classNames from 'classnames';

import { useEmbedItemChaptersLoad } from '../../hooks/useEmbedItemChaptersLoad';
import type { EmbedMediaType, EmbedSharedQueryParams } from '../../lib/embed/embedTypes';
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
  sharedQuery: EmbedSharedQueryParams;
};

export function EmbedPlayerPanel({
  fallbackResource,
  headerTitle,
  mediaType,
  panelLayout,
  sharedQuery,
}: EmbedPlayerPanelProps) {
  const isAudio = mediaType === 'audio';

  useEmbedItemChaptersLoad();
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
          <EmbedPlayerControls showChapterMarkers={sharedQuery.showChapterMarkers} />
        </>
      ) : (
        <div className={styles.videoPlaceholder}>
          <EmbedVideoPlaceholder />
        </div>
      )}
    </div>
  );
}
