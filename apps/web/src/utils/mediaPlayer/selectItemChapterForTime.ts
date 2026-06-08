import type { DTOItemChapter } from '@podverse/helpers';

const parseChapterStartSeconds = (chapter: DTOItemChapter): number | null => {
  const start =
    typeof chapter.start_time === 'string'
      ? Number.parseFloat(chapter.start_time)
      : chapter.start_time;
  return typeof start === 'number' && Number.isFinite(start) ? start : null;
};

/** True when any chapter in the list begins at or before zero seconds. */
export const hasChapterStartAtOrBeforeZero = (chapters: DTOItemChapter[]): boolean =>
  chapters.some((chapter) => {
    const start = parseChapterStartSeconds(chapter);
    return start !== null && start <= 0;
  });

/**
 * When a chapter starts at or before 0, suppress active-chapter selection until playhead > 0.
 */
export const shouldSuppressChapterSelectionAtTime = (
  chapters: DTOItemChapter[],
  currentTimeSeconds: number
): boolean => currentTimeSeconds <= 0 && hasChapterStartAtOrBeforeZero(chapters);

/**
 * Picks the active chapter for a playback time (seconds), matching NonLiveMediaOrchestrator
 * timeupdate and chapter list UI behavior: overlap must include end, chapters without
 * numeric end are skipped.
 */
export const selectItemChapterForTime = (
  chapters: DTOItemChapter[],
  currentTimeSeconds: number
): DTOItemChapter | null => {
  if (shouldSuppressChapterSelectionAtTime(chapters, currentTimeSeconds)) {
    return null;
  }

  const matchingChapters = chapters.filter((ch) => {
    const start = typeof ch.start_time === 'string' ? parseFloat(ch.start_time) : ch.start_time;
    const end = typeof ch.end_time === 'string' ? parseFloat(ch.end_time) : ch.end_time;
    if (typeof end !== 'number' || isNaN(end)) {
      return false;
    }
    return currentTimeSeconds >= start && currentTimeSeconds < end;
  });
  if (matchingChapters.length > 0) {
    return (
      matchingChapters.find((ch) => ch.table_of_contents === false) ?? matchingChapters[0] ?? null
    );
  }
  return null;
};
