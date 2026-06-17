'use client';

import classNames from 'classnames';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useEmbedResponsiveOverlayVisibility } from '../../hooks/useEmbedResponsiveOverlayVisibility';
import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { EmbedResponsiveControlsOverlay } from './EmbedResponsiveControlsOverlay';
import { EmbedResponsiveInfoOverlay } from './EmbedResponsiveInfoOverlay';
import { EmbedResponsiveMediaMount } from './EmbedResponsiveMediaMount';
import { EmbedSegmentInfoBar } from './EmbedSegmentInfoBar';

import styles from '../../styles/components/embed/EmbedResponsiveStage.module.scss';

type EmbedResponsiveStageProps = {
  fallbackResource: EmbedSingleResourcePayload | null;
  headerTitle?: string | null;
  onOpenAlternateEnclosureModal: () => void;
  showChapterMarkers: boolean;
};

export function EmbedResponsiveStage({
  fallbackResource,
  headerTitle,
  onOpenAlternateEnclosureModal,
  showChapterMarkers,
}: EmbedResponsiveStageProps) {
  const { mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const { isVisible, setIsFocused, setIsHovering } = useEmbedResponsiveOverlayVisibility({
    isPlaying: mpIsPlaying,
  });

  return (
    <div
      className={styles.responsiveStage}
      data-testid="embed-responsive-stage"
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
        <EmbedResponsiveMediaMount fallbackResource={fallbackResource} />
      </div>
      <div
        className={classNames(styles.overlayTop, !isVisible && styles.overlayHidden)}
        data-testid="embed-responsive-info-overlay"
      >
        <EmbedResponsiveInfoOverlay fallbackResource={fallbackResource} headerTitle={headerTitle} />
      </div>
      <div
        className={classNames(styles.overlaySegment, !isVisible && styles.overlayHidden)}
        data-testid="embed-responsive-segment-overlay"
      >
        <EmbedSegmentInfoBar fallbackResource={fallbackResource} />
      </div>
      <div
        className={classNames(styles.overlayBottom, !isVisible && styles.overlayHidden)}
        data-testid="embed-responsive-controls-overlay"
      >
        <EmbedResponsiveControlsOverlay
          onOpenAlternateEnclosureModal={onOpenAlternateEnclosureModal}
          showChapterMarkers={showChapterMarkers}
        />
      </div>
    </div>
  );
}
