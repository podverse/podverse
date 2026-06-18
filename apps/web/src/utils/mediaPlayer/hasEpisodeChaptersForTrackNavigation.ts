import type { DTOClip, DTOItemChapter, DTOItemSoundbite } from '@podverse/helpers';

type HasEpisodeChaptersForTrackNavigationParams = {
  mpClip: DTOClip | null;
  mpItemSoundbite: DTOItemSoundbite | null;
  mpItemChapters: DTOItemChapter[] | null;
};

/** Full-episode chapter prev/next on track buttons; not clip or official-clip playback. */
export function hasEpisodeChaptersForTrackNavigation({
  mpClip,
  mpItemSoundbite,
  mpItemChapters,
}: HasEpisodeChaptersForTrackNavigationParams): boolean {
  if (mpClip !== null || mpItemSoundbite !== null) {
    return false;
  }
  return Array.isArray(mpItemChapters) && mpItemChapters.length > 0;
}
