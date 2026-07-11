import type { DTOClip } from '@podverse/helpers';
import type { DTOItemChapter } from '@podverse/helpers';
import type { DTOItemSoundbite } from '@podverse/helpers';

import { selectItemChapterForTime } from '../../utils/mediaPlayer/selectItemChapterForTime';
import { parsePlaybackSeconds } from '../playback';
import { resolveEmbedPlaybackSegmentRefs } from './resolveEmbedPlaybackSegmentRefs';

export type EmbedActiveSegmentInfo = {
  endSeconds: number | null;
  startSeconds: number;
  title: string;
};

function segmentTitleFromString(title: string | null | undefined): string | null {
  const trimmed = title?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

function segmentFromClip(clip: DTOClip): EmbedActiveSegmentInfo | null {
  const title = segmentTitleFromString(clip.title);
  if (title === null) {
    return null;
  }

  const startSeconds = parsePlaybackSeconds(clip.start_time) ?? 0;
  const endSeconds = parsePlaybackSeconds(clip.end_time) ?? null;

  return { title, startSeconds, endSeconds };
}

function segmentFromSoundbite(soundbite: DTOItemSoundbite): EmbedActiveSegmentInfo | null {
  const title = segmentTitleFromString(soundbite.title);
  if (title === null) {
    return null;
  }

  const startSeconds = parsePlaybackSeconds(soundbite.start_time) ?? 0;
  const durationSeconds = parsePlaybackSeconds(soundbite.duration);
  const endSeconds = durationSeconds !== undefined ? startSeconds + durationSeconds : null;

  return { title, startSeconds, endSeconds };
}

function segmentFromChapter(chapter: DTOItemChapter): EmbedActiveSegmentInfo | null {
  const title = segmentTitleFromString(chapter.title);
  if (title === null) {
    return null;
  }

  const startSeconds = parsePlaybackSeconds(chapter.start_time) ?? 0;
  const endSeconds = parsePlaybackSeconds(chapter.end_time) ?? null;

  return { title, startSeconds, endSeconds };
}

export type ResolveEmbedActiveSegmentInfoParams = {
  currentTimeSeconds: number;
  fallbackChapter: DTOItemChapter | null;
  fallbackClip: DTOClip | null;
  fallbackSoundbite: DTOItemSoundbite | null;
  hasPlayerContent: boolean;
  mpClip: DTOClip | null;
  mpItemChapter: DTOItemChapter | null;
  mpItemChapters: DTOItemChapter[] | null;
  mpItemSoundbite: DTOItemSoundbite | null;
};

export function resolveEmbedActiveSegmentInfo(
  params: ResolveEmbedActiveSegmentInfoParams
): EmbedActiveSegmentInfo | null {
  const { clip, itemSoundbite } = resolveEmbedPlaybackSegmentRefs({
    hasPlayerContent: params.hasPlayerContent,
    mpClip: params.mpClip,
    mpItemSoundbite: params.mpItemSoundbite,
    fallbackClip: params.fallbackClip,
    fallbackItemSoundbite: params.fallbackSoundbite,
  });

  if (clip !== null) {
    return segmentFromClip(clip);
  }

  if (itemSoundbite !== null) {
    return segmentFromSoundbite(itemSoundbite);
  }

  const chapters = params.mpItemChapters ?? [];
  const activeChapterFromTime =
    chapters.length > 0 ? selectItemChapterForTime(chapters, params.currentTimeSeconds) : null;
  const chapter = activeChapterFromTime ?? params.mpItemChapter ?? params.fallbackChapter ?? null;

  if (chapter === null) {
    return null;
  }

  return segmentFromChapter(chapter);
}
