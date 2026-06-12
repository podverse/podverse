'use client';

import { useMediaPlayer } from '../contexts/MediaPlayer';
import { isEmbedPlayerContentReady } from '../lib/embed/embedPlayerContentReady';
import type { EmbedMediaType } from '../lib/embed/embedTypes';
import type { EmbedSingleResourcePayload } from '../lib/embed/fetchEmbedSingleResource';

type UseEmbedPlayerContentReadyInput = {
  fallbackResource: EmbedSingleResourcePayload | null;
  headerTitle?: string | null;
  mediaType: EmbedMediaType;
};

export function useEmbedPlayerContentReady({
  fallbackResource,
  headerTitle,
  mediaType,
}: UseEmbedPlayerContentReadyInput): boolean {
  const { mpChannel, mpItem } = useMediaPlayer();

  return isEmbedPlayerContentReady({
    fallbackResource,
    headerTitle,
    mediaType,
    mpChannel,
    mpItem,
  });
}
