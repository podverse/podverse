import {
  buildDTOItemImageLoadCandidates,
  findDTOItemImageBySize,
  prependDistinctImageCandidate,
} from '../image.js';

type SizeComparison = 'greater' | 'lesser' | null;

/** Primary URL matches legacy `findDTOItemImageBySize ?? [0]`, then full fallback chain. */
export function itemHeaderSquareArtworkCandidates(
  itemImages: Parameters<typeof findDTOItemImageBySize>[0],
  sizeFindTarget: number,
  comparison: SizeComparison
): string[] {
  const primaryRow =
    findDTOItemImageBySize(itemImages, sizeFindTarget, comparison) ?? itemImages?.[0];
  const chain = buildDTOItemImageLoadCandidates(itemImages, sizeFindTarget, comparison);
  return prependDistinctImageCandidate(primaryRow?.url, chain);
}
