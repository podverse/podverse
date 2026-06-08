import type { DTOClip, DTOItemSoundbite } from '@podverse/helpers';

type ShouldEmbedShowChapterInfoInput = {
  mpClip: DTOClip | null;
  mpItemSoundbite: DTOItemSoundbite | null;
  fallbackClip?: DTOClip | null;
  fallbackItemSoundbite?: DTOItemSoundbite | null;
};

/**
 * Clip and official-clip (soundbite) embeds play a segment only; parent-episode
 * chapter markers and time-based chapter titles are suppressed.
 */
export function shouldEmbedShowChapterInfo({
  mpClip,
  mpItemSoundbite,
  fallbackClip = null,
  fallbackItemSoundbite = null,
}: ShouldEmbedShowChapterInfoInput): boolean {
  const clip = mpClip ?? fallbackClip;
  const soundbite = mpItemSoundbite ?? fallbackItemSoundbite;

  return clip === null && soundbite === null;
}
