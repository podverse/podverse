import type { DTOItemChapter } from '@podverse/helpers';

/**
 * Unique chapter boundary ratios in (0, 1) for drawing vertical markers.
 * No marker at 0 or 1.
 */
export function getChapterBoundaryRatios(chapters: DTOItemChapter[], duration: number): number[] {
  if (duration <= 0) {
    return [];
  }
  const set = new Set<number>();
  for (const ch of chapters) {
    const startSec = Number(ch.start_time);
    const endSec = ch.end_time !== null && ch.end_time !== undefined ? Number(ch.end_time) : null;
    const startRatio = Math.max(0, Math.min(1, startSec / duration));
    const endRatio =
      endSec !== null && !isNaN(endSec) ? Math.max(0, Math.min(1, endSec / duration)) : 1;
    if (startRatio > 0 && startRatio < 1) {
      set.add(startRatio);
    }
    if (endRatio > 0 && endRatio < 1) {
      set.add(endRatio);
    }
  }
  return [...set].sort((a, b) => a - b);
}

/**
 * Chapter that contains the given position (0–1), or null.
 * Clamps chapter start/end to [0, duration]; missing end_time uses next chapter start or duration.
 */
export function getChapterAtPercent(
  percent: number,
  chapters: DTOItemChapter[],
  duration: number
): DTOItemChapter | null {
  if (duration <= 0 || chapters.length === 0) {
    return null;
  }
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    if (ch === undefined) {
      continue;
    }
    const startSec = Number(ch.start_time);
    let endSec: number;
    if (ch.end_time !== null && ch.end_time !== undefined && !isNaN(Number(ch.end_time))) {
      endSec = Number(ch.end_time);
    } else if (i < chapters.length - 1) {
      const nextCh = chapters[i + 1];
      endSec = nextCh !== undefined ? Number(nextCh.start_time) : duration;
    } else {
      endSec = duration;
    }
    const startRatio = Math.max(0, Math.min(1, startSec / duration));
    const endRatio = Math.max(0, Math.min(1, endSec / duration));
    if (percent >= startRatio && percent < endRatio) {
      return ch;
    }
  }
  return null;
}
