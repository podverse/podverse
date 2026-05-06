import { buildDTOChannelImageLoadCandidates, prependDistinctImageCandidate } from '../image.js';

export type AddByRSSFeedListArtworkCandidatesParams = {
  channelImages: Parameters<typeof buildDTOChannelImageLoadCandidates>[0];
  feedImageUrl: string | null | undefined;
  sizeFindTarget: number;
  comparison?: 'greater' | 'lesser' | null;
};

/** List/grid rows: feed override first, then full channel image chain (same target as Core podcast discovery when comparison is `lesser`). */
export function addByRSSFeedListArtworkCandidates({
  channelImages,
  feedImageUrl,
  sizeFindTarget,
  comparison = 'lesser',
}: AddByRSSFeedListArtworkCandidatesParams): string[] {
  return prependDistinctImageCandidate(
    feedImageUrl ?? undefined,
    buildDTOChannelImageLoadCandidates(channelImages, sizeFindTarget, comparison)
  );
}
