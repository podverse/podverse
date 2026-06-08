'use client';

import classNames from 'classnames';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useEmbedItemChaptersLoad } from '../../hooks/useEmbedItemChaptersLoad';
import type { EmbedMediaType, EmbedSharedQueryParams } from '../../lib/embed/embedTypes';
import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { shouldEmbedShowChapterInfo } from '../../lib/embed/shouldEmbedShowChapterInfo';
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
  const { mpClip, mpItemSoundbite } = useMediaPlayer();
  const showChapterMarkers =
    sharedQuery.showChapterMarkers &&
    shouldEmbedShowChapterInfo({
      mpClip,
      mpItemSoundbite,
      fallbackClip: fallbackResource?.clip ?? null,
      fallbackItemSoundbite: fallbackResource?.itemSoundbite ?? null,
    });

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
          <EmbedPlayerControls showChapterMarkers={showChapterMarkers} />
        </>
      ) : (
        <div className={styles.videoPlaceholder}>
          <EmbedVideoPlaceholder />
        </div>
      )}
    </div>
  );
}
