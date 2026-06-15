'use client';

import { useMediaPlayer } from '../contexts/MediaPlayer';
import { isEmbedPlayerContentReady } from '../lib/embed/embedPlayerContentReady';
import type { EmbedSingleResourcePayload } from '../lib/embed/fetchEmbedSingleResource';

type UseEmbedPlayerContentReadyInput = {
  fallbackResource: EmbedSingleResourcePayload | null;
  headerTitle?: string | null;
};

export function useEmbedPlayerContentReady({
  fallbackResource,
  headerTitle,
}: UseEmbedPlayerContentReadyInput): boolean {
  const { mpChannel, mpItem, mpClip, mpItemChapter, mpItemSoundbite } = useMediaPlayer();

  return isEmbedPlayerContentReady({
    fallbackResource,
    headerTitle,
    mpChannel,
    mpItem,
    mpClip,
    mpItemChapter,
    mpItemSoundbite,
  });
}
