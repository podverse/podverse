'use client';

import { getSelectedLabeledItemEnclosureAndSource } from '@podverse/helpers';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useNonLivePlaybackAvProps } from '../../hooks/useNonLivePlaybackAvProps';
import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { NonLiveMediaOrchestrator } from '../MediaPlayer/Controller/NonLiveMediaOrchestrator';
import { EmbedResponsiveCenterArt } from './EmbedResponsiveCenterArt';

import styles from '../../styles/components/embed/EmbedResponsiveMediaMount.module.scss';

type EmbedResponsiveMediaMountProps = {
  fallbackResource: EmbedSingleResourcePayload | null;
};

export function EmbedResponsiveMediaMount({ fallbackResource }: EmbedResponsiveMediaMountProps) {
  const avProps = useNonLivePlaybackAvProps();
  const { mpItemLabeledItemEnclosures, mpEnclosureSelectedParams } = useMediaPlayer();

  const selectedItemEnclosureAndSource =
    mpItemLabeledItemEnclosures.length > 0
      ? getSelectedLabeledItemEnclosureAndSource({
          labeledItemEnclosures: mpItemLabeledItemEnclosures,
          type: mpEnclosureSelectedParams.type,
          enclosureRowIndex: mpEnclosureSelectedParams.enclosureRowSelected,
          sourceRowIndex: mpEnclosureSelectedParams.sourceRowSelected,
        })
      : null;

  const isVideoEnclosure =
    selectedItemEnclosureAndSource?.labeledItemEnclosure?.mediaType === 'video';
  const showVideoElement = isVideoEnclosure;

  if (showVideoElement) {
    return (
      <div className={styles.videoFill} data-testid="embed-responsive-video-element">
        <NonLiveMediaOrchestrator
          {...avProps}
          mediaType="video"
          preload="auto"
          style={{ height: '100%', objectFit: 'contain', width: '100%' }}
        />
      </div>
    );
  }

  return (
    <>
      <NonLiveMediaOrchestrator {...avProps} mediaType="audio" preload="auto" hidden={true} />
      <EmbedResponsiveCenterArt fallbackResource={fallbackResource} />
    </>
  );
}
