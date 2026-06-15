'use client';

import classNames from 'classnames';
import { useState } from 'react';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useEmbedItemChaptersLoad } from '../../hooks/useEmbedItemChaptersLoad';
import { useEmbedPlayerContentReady } from '../../hooks/useEmbedPlayerContentReady';
import type { EmbedPlayerSizeQuery, EmbedSharedQueryParams } from '../../lib/embed/embedTypes';
import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { resolveEmbedPlaybackSegmentRefs } from '../../lib/embed/resolveEmbedPlaybackSegmentRefs';
import { shouldEmbedShowChapterInfo } from '../../lib/embed/shouldEmbedShowChapterInfo';
import { EmbedAlternateEnclosureModal } from './EmbedAlternateEnclosureModal';
import { EmbedInlineMediaMount } from './EmbedInlineMediaMount';
import { EmbedPlayerControls } from './EmbedPlayerControls';
import { EmbedPlayerInfo } from './EmbedPlayerInfo';
import { EmbedPlayerLoadingOverlay } from './EmbedPlayerLoadingOverlay';
import { EmbedTallStage } from './EmbedTallStage';

import styles from '../../styles/components/embed/EmbedPlayerPanel.module.scss';

type EmbedPlayerPanelLayout = 'single' | 'list';

type EmbedPlayerPanelProps = {
  fallbackResource: EmbedSingleResourcePayload | null;
  headerTitle?: string | null;
  panelLayout: EmbedPlayerPanelLayout;
  playerSize: EmbedPlayerSizeQuery;
  listTallAutoResize?: boolean;
  sharedQuery: EmbedSharedQueryParams;
};

export function EmbedPlayerPanel({
  fallbackResource,
  headerTitle,
  panelLayout,
  playerSize,
  listTallAutoResize = false,
  sharedQuery,
}: EmbedPlayerPanelProps) {
  const isShortPlayer = playerSize === 'short';
  const { mpAddByRSS, mpChannel, mpClip, mpItemSoundbite } = useMediaPlayer();
  const [isAlternateEnclosureModalOpen, setIsAlternateEnclosureModalOpen] = useState(false);
  const hasPlayerContent = mpChannel !== null || mpAddByRSS !== null;
  const { clip, itemSoundbite } = resolveEmbedPlaybackSegmentRefs({
    hasPlayerContent,
    mpClip,
    mpItemSoundbite,
    fallbackClip: fallbackResource?.clip ?? null,
    fallbackItemSoundbite: fallbackResource?.itemSoundbite ?? null,
  });
  const showChapterMarkers =
    sharedQuery.showChapterMarkers && shouldEmbedShowChapterInfo({ clip, itemSoundbite });

  useEmbedItemChaptersLoad();
  const isContentReady = useEmbedPlayerContentReady({
    fallbackResource,
    headerTitle,
  });
  const playerRegionClassName = classNames(
    styles.playerRegion,
    panelLayout === 'single' ? styles.playerRegionSingle : styles.playerRegionList,
    !isShortPlayer && styles.playerRegionTall,
    panelLayout === 'list' && listTallAutoResize && styles.playerRegionListTallAutoResize
  );
  return (
    <div className={playerRegionClassName} data-testid="embed-player-region">
      <div className={styles.playerSurface} data-testid="embed-player-surface">
        <EmbedPlayerLoadingOverlay isLoading={!isContentReady} />
        {isShortPlayer ? (
          <EmbedPlayerInfo fallbackResource={fallbackResource} headerTitle={headerTitle} />
        ) : null}
        {isShortPlayer ? (
          <>
            <EmbedInlineMediaMount />
            <EmbedPlayerControls
              onOpenAlternateEnclosureModal={() => {
                setIsAlternateEnclosureModalOpen(true);
              }}
              showChapterMarkers={showChapterMarkers}
            />
          </>
        ) : (
          <EmbedTallStage
            fallbackResource={fallbackResource}
            headerTitle={headerTitle}
            listTallAutoResize={listTallAutoResize}
            onOpenAlternateEnclosureModal={() => {
              setIsAlternateEnclosureModalOpen(true);
            }}
            showChapterMarkers={showChapterMarkers}
          />
        )}
        <EmbedAlternateEnclosureModal
          isOpen={isAlternateEnclosureModalOpen}
          onClose={() => {
            setIsAlternateEnclosureModalOpen(false);
          }}
        />
      </div>
    </div>
  );
}
