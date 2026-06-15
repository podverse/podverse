'use client';

import { useEffect, useRef } from 'react';

import { buildLabeledItemEnclosures } from '@podverse/helpers';

import { useMediaPlayer } from '../contexts/MediaPlayer';
import { buildEmbedSinglePlaybackTarget } from '../lib/embed/buildEmbedSinglePlaybackTarget';
import { EMBED_DISABLED_AUTO_QUEUE_CONFIG } from '../lib/embed/embedAutoQueueConfig';
import type { EmbedMediaType } from '../lib/embed/embedTypes';
import type { EmbedSingleResourcePayload } from '../lib/embed/fetchEmbedSingleResource';
import { resolveEmbedBestFitEnclosureSelectedParams } from '../lib/embed/resolveEmbedBestFitEnclosure';
import { resolveEmbedConnectionQualityTarget } from '../lib/embed/resolveEmbedConnectionQualityTarget';
import { useMediaPlayerResourceUpdate } from './useMediaPlayerResourceUpdate';

type UseEmbedPlaybackLoadInput = {
  resource: EmbedSingleResourcePayload | null;
  shouldPlay: boolean;
  startSeconds: number;
  enabled: boolean;
  embedMediaType: EmbedMediaType;
};

export function useEmbedPlaybackLoad({
  resource,
  shouldPlay,
  startSeconds,
  enabled,
  embedMediaType,
}: UseEmbedPlaybackLoadInput): void {
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const mediaPlayerResourceUpdateRef = useRef(mediaPlayerResourceUpdate);
  const lastBestFitSelectionKeyRef = useRef<string | null>(null);
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
    const labeledEnclosures = buildLabeledItemEnclosures(resource.item.item_enclosures || []);

    // Re-run best-fit selection for a new item or when the embed presentation
    // switches audio<->video (so a mixed list picks the best fit for the new mode);
    // preserve a user's alternate-enclosure choice on same-item, same-mode reloads
    // (e.g. toggling play/pause).
    const bestFitSelectionKey = `${resource.item.id_text}::${embedMediaType}`;
    const shouldApplyBestFit = lastBestFitSelectionKeyRef.current !== bestFitSelectionKey;
    const enclosureSelectedParams = shouldApplyBestFit
      ? resolveEmbedBestFitEnclosureSelectedParams(labeledEnclosures, embedMediaType, {
          connectionTarget: resolveEmbedConnectionQualityTarget(),
        })
      : 'use-active-item-or-default';

    mediaPlayerResourceUpdateRef.current({
      target,
      explicitPlaybackSeconds,
      itemChapterShouldSeek: resource.itemChapter !== null,
      shouldPlay,
      isPlaying: shouldPlay,
      enclosureSelectedParams,
      skipMoveNowPlayingToHistory: true,
      newAutoQueueConfig: EMBED_DISABLED_AUTO_QUEUE_CONFIG,
      autoQueueShouldClear: false,
    });

    setMPItemLabeledItemEnclosures(labeledEnclosures);
    lastBestFitSelectionKeyRef.current = bestFitSelectionKey;
  }, [
    embedMediaType,
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
