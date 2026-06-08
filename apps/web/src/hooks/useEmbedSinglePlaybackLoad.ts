'use client';

import type { EmbedSharedQueryParams } from '../lib/embed/embedTypes';
import type { EmbedSingleResourcePayload } from '../lib/embed/fetchEmbedSingleResource';
import { useEmbedPlaybackLoad } from './useEmbedPlaybackLoad';

export function useEmbedSinglePlaybackLoad(
  resource: EmbedSingleResourcePayload,
  sharedQuery: EmbedSharedQueryParams,
  enabled: boolean
): void {
  useEmbedPlaybackLoad({
    resource,
    shouldPlay: sharedQuery.autoplay,
    startSeconds: sharedQuery.startSeconds,
    enabled,
  });
}
