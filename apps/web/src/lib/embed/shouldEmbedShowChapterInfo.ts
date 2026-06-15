import type { DTOClip, DTOItemSoundbite } from '@podverse/helpers';

type ShouldEmbedShowChapterInfoInput = {
  clip: DTOClip | null;
  itemSoundbite: DTOItemSoundbite | null;
};

/**
 * Clip and official-clip (soundbite) embeds play a segment only; parent-episode
 * chapter markers and time-based chapter titles are suppressed while a segment
 * ref is active. Callers should pass refs from resolveEmbedPlaybackSegmentRefs.
 */
export function shouldEmbedShowChapterInfo({
  clip,
  itemSoundbite,
}: ShouldEmbedShowChapterInfoInput): boolean {
  return clip === null && itemSoundbite === null;
}
