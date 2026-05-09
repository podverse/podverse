import {
  buildDTOItemImageHeroLoadCandidates,
  findDTOItemImageForHero,
  prependDistinctImageCandidate,
} from '../image.js';

/** Primary URL then full fallback chain for largest usable item artwork (header lightbox). */
export function itemHeaderLightboxArtworkCandidates(
  itemImages: Parameters<typeof findDTOItemImageForHero>[0]
): string[] {
  const primaryRow = findDTOItemImageForHero(itemImages, 'largest', 'greater') ?? itemImages?.[0];
  const chain = buildDTOItemImageHeroLoadCandidates(itemImages, 'largest', 'greater');
  return prependDistinctImageCandidate(primaryRow?.url, chain);
}
