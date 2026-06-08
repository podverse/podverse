import type { DTOItemChapter } from '@podverse/helpers';

import { selectItemChapterForTime } from '../../utils/mediaPlayer/selectItemChapterForTime';

type ResolveEmbedActiveChapterForArtworkInput = {
  showChapterInfo: boolean;
  preferItemTitle: boolean;
  mpItemChapters: DTOItemChapter[] | null;
  mpCurrentTimeSeconds: number;
  mpItemChapter: DTOItemChapter | null;
  fallbackItemChapter?: DTOItemChapter | null;
};

/**
 * Keeps embed artwork aligned with time-based chapter titles: use the active
 * chapter from the chapters list when the playhead is inside one, otherwise the
 * loaded chapter target (chapter embed) or SSR fallback.
 */
export function resolveEmbedActiveChapterForArtwork({
  showChapterInfo,
  preferItemTitle,
  mpItemChapters,
  mpCurrentTimeSeconds,
  mpItemChapter,
  fallbackItemChapter = null,
}: ResolveEmbedActiveChapterForArtworkInput): DTOItemChapter | null {
  if (!showChapterInfo || preferItemTitle) {
    return null;
  }

  const chapters = mpItemChapters ?? [];
  if (chapters.length > 0) {
    const fromTime = selectItemChapterForTime(chapters, mpCurrentTimeSeconds);
    if (fromTime !== null) {
      return fromTime;
    }
  }

  if (mpItemChapter !== null) {
    return mpItemChapter;
  }

  return fallbackItemChapter;
}
