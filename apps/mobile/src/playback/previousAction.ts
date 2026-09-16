import type { DTOItemChapter } from '@podverse/helpers/dto';
import type { PlaybackTarget } from '@podverse/playback-core';
import { selectItemChapterForTime } from '@podverse/playback-core/selectItemChapterForTime';

export const PREVIOUS_CHAPTER_GRACE_SECONDS = 3;

export type PreviousAction =
  | { kind: 'seek-chapter-start'; seekSeconds: number }
  | { kind: 'seek-previous-chapter'; seekSeconds: number }
  | { kind: 'previous-queue-item' }
  | { kind: 'seek-zero'; seekSeconds: 0 };

export type NextAction =
  | { kind: 'seek-next-chapter'; seekSeconds: number }
  | { kind: 'next-queue-item' }
  | { kind: 'none' };

export type ResolvePreviousActionInput = {
  chapters: DTOItemChapter[];
  hasPreviousQueueItem: boolean;
  positionSeconds: number;
  graceSeconds?: number;
};

export type ResolveNextActionInput = {
  chapters: DTOItemChapter[];
  positionSeconds: number;
};

export type ResolveJumpTargetInput = {
  deltaSeconds: number;
  lowerBoundSeconds: number;
  positionSeconds: number;
  upperBoundSeconds: number | null;
};

const parseSeconds = (value: string | number | null | undefined): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const nonNegative = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
};

type ChapterWithStart = {
  chapter: DTOItemChapter;
  startSeconds: number;
};

const chapterStarts = (chapters: DTOItemChapter[]): ChapterWithStart[] => {
  return chapters
    .filter((chapter) => chapter.table_of_contents !== false)
    .map((chapter): ChapterWithStart | null => {
      const startSeconds = parseSeconds(chapter.start_time);
      if (startSeconds === null) {
        return null;
      }
      return {
        chapter,
        startSeconds: nonNegative(startSeconds),
      };
    })
    .flatMap((row) => (row === null ? [] : [row]))
    .sort((a, b) => a.startSeconds - b.startSeconds);
};

const previousChapterBefore = (
  chapters: ChapterWithStart[],
  activeChapter: DTOItemChapter,
  activeStartSeconds: number
): ChapterWithStart | null => {
  const activeIndex = chapters.findIndex(
    (entry) => entry.chapter.id_text === activeChapter.id_text
  );
  if (activeIndex > 0) {
    return chapters[activeIndex - 1] ?? null;
  }
  const before = chapters.filter((entry) => entry.startSeconds < activeStartSeconds);
  return before[before.length - 1] ?? null;
};

const nextChapterAfter = (
  chapters: ChapterWithStart[],
  activeChapter: DTOItemChapter
): ChapterWithStart | null => {
  const activeIndex = chapters.findIndex(
    (entry) => entry.chapter.id_text === activeChapter.id_text
  );
  if (activeIndex < 0 || activeIndex >= chapters.length - 1) {
    return null;
  }
  return chapters[activeIndex + 1] ?? null;
};

/**
 * Full-episode chapter prev/next on track buttons — not clip or soundbite playback.
 * Mirrors web `hasEpisodeChaptersForTrackNavigation`.
 */
export const hasEpisodeChaptersForTrackButtons = (
  target: PlaybackTarget | null,
  chapters: DTOItemChapter[]
): boolean => {
  if (target === null) {
    return false;
  }
  if (target.kind === 'clip' || target.kind === 'soundbite') {
    return false;
  }
  return chapters.length > 0;
};

/**
 * Chapters that participate in track-button navigation for the current target. Clip and soundbite
 * playback never use chapter prev/next (web parity).
 */
export const chaptersForTrackButtons = (
  target: PlaybackTarget | null,
  chapters: DTOItemChapter[]
): DTOItemChapter[] => {
  if (!hasEpisodeChaptersForTrackButtons(target, chapters)) {
    return [];
  }
  return chapters;
};

export const resolvePreviousAction = (input: ResolvePreviousActionInput): PreviousAction => {
  const positionSeconds = nonNegative(input.positionSeconds);
  const graceSeconds = nonNegative(input.graceSeconds ?? PREVIOUS_CHAPTER_GRACE_SECONDS);
  const starts = chapterStarts(input.chapters);
  const activeChapter =
    starts.length === 0 ? null : selectItemChapterForTime(input.chapters, positionSeconds);

  if (activeChapter === null) {
    // No chapters: restart when past the grace window, otherwise previous queue item (web parity).
    if (positionSeconds > graceSeconds) {
      return { kind: 'seek-zero', seekSeconds: 0 };
    }
    return input.hasPreviousQueueItem
      ? { kind: 'previous-queue-item' }
      : { kind: 'seek-zero', seekSeconds: 0 };
  }

  const activeStartSeconds = nonNegative(parseSeconds(activeChapter.start_time) ?? 0);
  if (positionSeconds - activeStartSeconds > graceSeconds) {
    return { kind: 'seek-chapter-start', seekSeconds: activeStartSeconds };
  }

  const previousChapter = previousChapterBefore(starts, activeChapter, activeStartSeconds);
  if (previousChapter !== null) {
    return { kind: 'seek-previous-chapter', seekSeconds: previousChapter.startSeconds };
  }

  return input.hasPreviousQueueItem
    ? { kind: 'previous-queue-item' }
    : { kind: 'seek-zero', seekSeconds: 0 };
};

export const resolveNextAction = (input: ResolveNextActionInput): NextAction => {
  const positionSeconds = nonNegative(input.positionSeconds);
  const starts = chapterStarts(input.chapters);
  if (starts.length === 0) {
    return { kind: 'next-queue-item' };
  }

  const activeChapter = selectItemChapterForTime(input.chapters, positionSeconds);
  if (activeChapter === null) {
    return { kind: 'next-queue-item' };
  }

  const nextChapter = nextChapterAfter(starts, activeChapter);
  if (nextChapter === null) {
    return { kind: 'none' };
  }
  return { kind: 'seek-next-chapter', seekSeconds: nextChapter.startSeconds };
};

export const resolveJumpTarget = (input: ResolveJumpTargetInput): number => {
  const lowerBoundSeconds = nonNegative(input.lowerBoundSeconds);
  const start = Math.max(lowerBoundSeconds, nonNegative(input.positionSeconds));
  const deltaSeconds = Number.isFinite(input.deltaSeconds) ? input.deltaSeconds : 0;
  const rawTarget = start + deltaSeconds;
  const clampedToLower = Math.max(lowerBoundSeconds, rawTarget);

  if (input.upperBoundSeconds === null || !Number.isFinite(input.upperBoundSeconds)) {
    return clampedToLower;
  }

  const upperBoundSeconds = Math.max(lowerBoundSeconds, input.upperBoundSeconds);
  return Math.min(upperBoundSeconds, clampedToLower);
};
