import type { DTOItemChapter } from '@podverse/helpers/dto';
import type { PlaybackTarget } from '@podverse/playback-core';
import { selectItemChapterForTime } from '@podverse/playback-core/selectItemChapterForTime';

export type NowPlayingSegmentKind = 'chapter' | 'clip' | 'official-clip';

/** The sub-part of an episode currently playing: a clip, an official clip, or a chapter. */
export type NowPlayingSegment = {
  kind: NowPlayingSegmentKind;
  title: string;
};

const named = (
  kind: NowPlayingSegmentKind,
  title: string | null | undefined
): NowPlayingSegment | null => {
  if (typeof title !== 'string' || title.length === 0) {
    return null;
  }
  return { kind, title };
};

/**
 * What the now-playing chrome should name above the episode title, or `null` when the whole episode
 * is playing and there is nothing extra to say.
 *
 * A clip, official clip, or chapter target names itself. A plain episode follows its chapter list
 * against the playhead with the same selection every other surface uses, so the chapter named here
 * matches the chapter list and the web player.
 */
export const resolveNowPlayingSegment = ({
  chapters,
  positionSeconds,
  target,
}: {
  chapters: DTOItemChapter[];
  positionSeconds: number;
  target: PlaybackTarget | null;
}): NowPlayingSegment | null => {
  if (target === null) {
    return null;
  }
  if (target.kind === 'clip') {
    return named('clip', target.clip.title);
  }
  if (target.kind === 'soundbite') {
    return named('official-clip', target.soundbite.title);
  }
  if (target.kind === 'chapter') {
    return named('chapter', target.chapter.title);
  }
  return named('chapter', selectItemChapterForTime(chapters, positionSeconds)?.title);
};
