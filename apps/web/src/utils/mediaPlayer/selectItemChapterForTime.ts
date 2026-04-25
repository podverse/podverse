import type { DTOItemChapter } from '@podverse/helpers';

/**
 * Picks the active chapter for a playback time (seconds), matching MediaPlayerControllerAV
 * timeupdate and chapter list UI behavior: overlap must include end, chapters without
 * numeric end are skipped.
 */
export const selectItemChapterForTime = (
  chapters: DTOItemChapter[],
  currentTimeSeconds: number
): DTOItemChapter | null => {
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
