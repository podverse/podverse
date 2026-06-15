'use client';

import type { EmbedMediaType, EmbedSharedQueryParams } from '../lib/embed/embedTypes';
import type { EmbedSingleResourcePayload } from '../lib/embed/fetchEmbedSingleResource';
import { useEmbedPlaybackLoad } from './useEmbedPlaybackLoad';

export function useEmbedSinglePlaybackLoad(
  resource: EmbedSingleResourcePayload,
  sharedQuery: EmbedSharedQueryParams,
  enabled: boolean,
  mediaType: EmbedMediaType
): void {
  useEmbedPlaybackLoad({
    resource,
    shouldPlay: false,
    startSeconds: sharedQuery.startSeconds,
    enabled,
    embedMediaType: mediaType,
  });
}
