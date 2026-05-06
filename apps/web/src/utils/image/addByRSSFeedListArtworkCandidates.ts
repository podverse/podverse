import { addByRSSFeedListArtworkCandidates as addByRSSFeedListArtworkCandidatesCore } from '@podverse/helpers';

import { IMAGES } from '../../constants/images';
import type { AddByRSSFeedRecord } from '../addByRSS/types';

/** List/grid rows: feed override first, then full channel image chain (same target as Core podcast discovery). */
export function addByRSSFeedListArtworkCandidates(feed: AddByRSSFeedRecord): string[] {
  return addByRSSFeedListArtworkCandidatesCore({
    channelImages: feed.mappedFeed?.channel?.images,
    feedImageUrl: feed.imageUrl,
    sizeFindTarget: IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
    comparison: 'lesser',
  });
}
