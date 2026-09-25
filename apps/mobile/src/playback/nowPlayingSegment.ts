import type { DTOItemChapter } from '@podverse/helpers/dto';
import { isValidHttpUrl } from '@podverse/helpers-validation/client';
import type { PlaybackTarget } from '@podverse/playback-core';
import { selectItemChapterForTime } from '@podverse/playback-core/selectItemChapterForTime';

export type NowPlayingSegmentKind = 'chapter' | 'clip' | 'official-clip';

/** The sub-part of an episode currently playing: a clip, an official clip, or a chapter. */
export type NowPlayingSegment = {
  endTime: string | null;
  kind: NowPlayingSegmentKind;
  startTime: string | null;
  title: string;
  /** External chapter webpage when the named segment is a chapter and `web_url` is http(s). */
  webUrl: string | null;
};

const resolveChapterWebUrl = (webUrl: string | null | undefined): string | null => {
  if (typeof webUrl !== 'string' || webUrl.length === 0) {
    return null;
  }
  return isValidHttpUrl(webUrl) ? webUrl : null;
};

/** Catalog key for the accessible name of a now-playing segment. */
export const nowPlayingSegmentLabelKey = (kind: NowPlayingSegmentKind): string => {
  switch (kind) {
    case 'chapter':
      return 'media_player.now_playing_chapter';
    case 'clip':
      return 'media_player.now_playing_clip';
    case 'official-clip':
      return 'media_player.now_playing_official_clip';
  }
};

const asTime = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  return value;
};

/** Official-clip end is start plus duration, matching the web player subsection clock. */
export const soundbiteEndTime = (startTime: string, duration: string): string | null => {
  const startSeconds = Number.parseFloat(startTime);
  const durationSeconds = Number.parseFloat(duration);
  if (!Number.isFinite(startSeconds) || !Number.isFinite(durationSeconds)) {
    return null;
  }
  return String(startSeconds + durationSeconds);
};

const named = (
  kind: NowPlayingSegmentKind,
  title: string | null | undefined,
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  webUrl: string | null | undefined = null
): NowPlayingSegment | null => {
  if (typeof title !== 'string' || title.length === 0) {
    return null;
  }
  return {
    endTime: asTime(endTime),
    kind,
    startTime: asTime(startTime),
    title,
    webUrl: kind === 'chapter' ? resolveChapterWebUrl(webUrl) : null,
  };
};

/**
 * What the now-playing chrome should name above the episode title, or `null` when the whole episode
 * is playing and there is nothing extra to say.
 *
 * A clip, official clip, or chapter target names itself. A plain episode follows its chapter list
 * against the playhead with the same selection every other surface uses, so the chapter named here
 * matches the chapter list and the web player. While the scrubber is held,
 * `previewPositionSeconds` is the lookup time so the name can change before the engine seeks.
 */
export const resolveNowPlayingSegment = ({
  chapters,
  positionSeconds,
  previewPositionSeconds = null,
  target,
}: {
  chapters: DTOItemChapter[];
  positionSeconds: number;
  previewPositionSeconds?: number | null;
  target: PlaybackTarget | null;
}): NowPlayingSegment | null => {
  if (target === null) {
    return null;
  }
  if (target.kind === 'clip') {
    return named('clip', target.clip.title, target.clip.start_time, target.clip.end_time);
  }
  if (target.kind === 'soundbite') {
    return named(
      'official-clip',
      target.soundbite.title,
      target.soundbite.start_time,
      soundbiteEndTime(target.soundbite.start_time, target.soundbite.duration)
    );
  }
  const lookupSeconds = previewPositionSeconds ?? positionSeconds;
  if (target.kind === 'chapter' && previewPositionSeconds === null) {
    return named(
      'chapter',
      target.chapter.title,
      target.chapter.start_time,
      target.chapter.end_time,
      target.chapter.web_url
    );
  }
  const chapter = selectItemChapterForTime(chapters, lookupSeconds);
  return named('chapter', chapter?.title, chapter?.start_time, chapter?.end_time, chapter?.web_url);
};
