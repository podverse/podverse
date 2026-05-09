import {
  buildDTOItemImageHeroLoadCandidates,
  findDTOItemImageForHero,
  prependDistinctImageCandidate,
} from '../image.js';

type SizeComparison = 'greater' | 'lesser' | null;

/**
 * Square episode/track/chapter/clip **header** artwork. Primary + chain avoid list-oriented
 * {@link buildDTOItemImageLoadCandidates} (shrunken-first); use **`greater`** with
 * `IMAGES.HEADER.*.SIZE_FIND_TARGET` so the displayed asset is at least as wide as the hero slot.
 */
export function itemHeaderSquareArtworkCandidates(
  itemImages: Parameters<typeof findDTOItemImageForHero>[0],
  sizeFindTarget: number,
  comparison: SizeComparison
): string[] {
  const primaryRow =
    findDTOItemImageForHero(itemImages, sizeFindTarget, comparison) ?? itemImages?.[0];
  const chain = buildDTOItemImageHeroLoadCandidates(itemImages, sizeFindTarget, comparison);
  return prependDistinctImageCandidate(primaryRow?.url, chain);
}
