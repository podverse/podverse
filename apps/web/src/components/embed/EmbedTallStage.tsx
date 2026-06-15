'use client';

import classNames from 'classnames';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useEmbedTallOverlayVisibility } from '../../hooks/useEmbedTallOverlayVisibility';
import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { EmbedSegmentInfoBar } from './EmbedSegmentInfoBar';
import { EmbedTallControlsOverlay } from './EmbedTallControlsOverlay';
import { EmbedTallInfoOverlay } from './EmbedTallInfoOverlay';
import { EmbedTallMediaMount } from './EmbedTallMediaMount';

import styles from '../../styles/components/embed/EmbedTallStage.module.scss';

type EmbedTallStageProps = {
  fallbackResource: EmbedSingleResourcePayload | null;
  headerTitle?: string | null;
  listTallAutoResize?: boolean;
  onOpenAlternateEnclosureModal: () => void;
  showChapterMarkers: boolean;
};

export function EmbedTallStage({
  fallbackResource,
  headerTitle,
  listTallAutoResize = false,
  onOpenAlternateEnclosureModal,
  showChapterMarkers,
}: EmbedTallStageProps) {
  const { mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const { isVisible, setIsFocused, setIsHovering } = useEmbedTallOverlayVisibility({
    isPlaying: mpIsPlaying,
  });

  return (
    <div
      className={classNames(styles.tallStage, listTallAutoResize && styles.tallStageAutoResize)}
      data-testid="embed-tall-stage"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsFocused(false);
        }
      }}
      onClick={() => setMPIsPlaying(!mpIsPlaying)}
      onFocus={() => setIsFocused(true)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={() => setIsHovering(true)}
    >
      <div className={styles.mediaLayer}>
        <EmbedTallMediaMount fallbackResource={fallbackResource} />
      </div>
      <div
        className={classNames(styles.overlayTop, !isVisible && styles.overlayHidden)}
        data-testid="embed-tall-info-overlay"
      >
        <EmbedTallInfoOverlay fallbackResource={fallbackResource} headerTitle={headerTitle} />
      </div>
      <div
        className={classNames(styles.overlaySegment, !isVisible && styles.overlayHidden)}
        data-testid="embed-tall-segment-overlay"
      >
        <EmbedSegmentInfoBar fallbackResource={fallbackResource} />
      </div>
      <div
        className={classNames(styles.overlayBottom, !isVisible && styles.overlayHidden)}
        data-testid="embed-tall-controls-overlay"
      >
        <EmbedTallControlsOverlay
          onOpenAlternateEnclosureModal={onOpenAlternateEnclosureModal}
          showChapterMarkers={showChapterMarkers}
        />
      </div>
    </div>
  );
}
