import { MediumEnum } from '@podverse/helpers';

import type { AddByRSSMappedFeed } from './types.js';

/**
 * Derive per-item medium from the first enclosure MIME type.
 * If it starts with "video/", return Video; otherwise return feedMediumFallback.
 */
export const getItemMediumIdFromBundle = (
  bundle: AddByRSSMappedFeed['items'][number],
  feedMediumFallback: number | null
): number | null => {
  const type = bundle.enclosures?.[0]?.item_enclosure?.type;
  if (typeof type === 'string' && type.toLowerCase().startsWith('video/')) {
    return MediumEnum.Video;
  }
  return feedMediumFallback;
};
