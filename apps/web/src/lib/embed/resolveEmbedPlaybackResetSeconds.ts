import type { DTOClip, DTOItemSoundbite } from '@podverse/helpers';

import type { PlaybackTarget } from '../playback';
import { parsePlaybackSeconds } from '../playback/parsePlaybackSeconds';

export function resolveEmbedPlaybackResetSeconds(params: {
  activePlaybackTarget: PlaybackTarget | null;
  mpClip: DTOClip | null;
  mpItemSoundbite: DTOItemSoundbite | null;
}): number {
  if (params.mpClip !== null) {
    return parsePlaybackSeconds(params.mpClip.start_time) ?? 0;
  }

  if (params.mpItemSoundbite !== null) {
    return parsePlaybackSeconds(params.mpItemSoundbite.start_time) ?? 0;
  }

  if (params.activePlaybackTarget?.kind === 'chapter') {
    return parsePlaybackSeconds(params.activePlaybackTarget.chapter.start_time) ?? 0;
  }

  return 0;
}

export function resolveEmbedPlaybackPauseAtSeconds(params: {
  activePlaybackTarget: PlaybackTarget | null;
  mpClip: DTOClip | null;
  mpItemSoundbite: DTOItemSoundbite | null;
}): number | null {
  if (params.mpClip !== null) {
    const endSeconds = parsePlaybackSeconds(params.mpClip.end_time);
    return endSeconds !== undefined ? endSeconds + 1 : null;
  }

  if (params.mpItemSoundbite !== null) {
    const startSeconds = parsePlaybackSeconds(params.mpItemSoundbite.start_time) ?? 0;
    const durationSeconds = parsePlaybackSeconds(params.mpItemSoundbite.duration) ?? 0;
    return startSeconds + durationSeconds + 1;
  }

  if (params.activePlaybackTarget?.kind === 'chapter') {
    const endSeconds = parsePlaybackSeconds(params.activePlaybackTarget.chapter.end_time);
    return endSeconds !== undefined ? endSeconds + 1 : null;
  }

  return null;
}
