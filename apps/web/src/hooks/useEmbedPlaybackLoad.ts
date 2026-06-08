'use client';

import { useEffect, useRef } from 'react';

import { buildLabeledItemEnclosures } from '@podverse/helpers';

import { useMediaPlayer } from '../contexts/MediaPlayer';
import { buildEmbedSinglePlaybackTarget } from '../lib/embed/buildEmbedSinglePlaybackTarget';
import { EMBED_DISABLED_AUTO_QUEUE_CONFIG } from '../lib/embed/embedAutoQueueConfig';
import type { EmbedSingleResourcePayload } from '../lib/embed/fetchEmbedSingleResource';
import { useMediaPlayerResourceUpdate } from './useMediaPlayerResourceUpdate';

type UseEmbedPlaybackLoadInput = {
  resource: EmbedSingleResourcePayload | null;
  shouldPlay: boolean;
  startSeconds: number;
  enabled: boolean;
};

export function useEmbedPlaybackLoad({
  resource,
  shouldPlay,
  startSeconds,
  enabled,
}: UseEmbedPlaybackLoadInput): void {
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const mediaPlayerResourceUpdateRef = useRef(mediaPlayerResourceUpdate);
  const { setMPItemLabeledItemEnclosures } = useMediaPlayer();

  useEffect(() => {
    mediaPlayerResourceUpdateRef.current = mediaPlayerResourceUpdate;
  }, [mediaPlayerResourceUpdate]);

  useEffect(() => {
    if (!enabled || resource === null) {
      return;
    }

    const target = buildEmbedSinglePlaybackTarget(resource);
    const explicitPlaybackSeconds = startSeconds > 0 ? startSeconds : undefined;

    mediaPlayerResourceUpdateRef.current({
      target,
      explicitPlaybackSeconds,
      itemChapterShouldSeek: resource.itemChapter !== null,
      shouldPlay,
      isPlaying: shouldPlay,
      enclosureSelectedParams: 'use-active-item-or-default',
      skipMoveNowPlayingToHistory: true,
      newAutoQueueConfig: EMBED_DISABLED_AUTO_QUEUE_CONFIG,
      autoQueueShouldClear: false,
    });

    const labeledEnclosures = buildLabeledItemEnclosures(resource.item.item_enclosures || []);
    setMPItemLabeledItemEnclosures(labeledEnclosures);
  }, [
    enabled,
    resource?.clip?.id_text,
    resource?.item.id_text,
    resource?.itemChapter?.id_text,
    resource?.itemSoundbite?.id_text,
    setMPItemLabeledItemEnclosures,
    shouldPlay,
    startSeconds,
  ]);
}
