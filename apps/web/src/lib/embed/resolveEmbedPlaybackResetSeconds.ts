import type { DTOClip, DTOItemSoundbite } from '@podverse/helpers';

import type { PlaybackTarget } from '../playback';
import { parsePlaybackSeconds } from '../playback';

export function resolveEmbedPlaybackResetSeconds(params: {
  activePlaybackTarget: PlaybackTarget | null;
  mpClip: DTOClip | null;
  mpItemSoundbite: DTOItemSoundbite | null;
}): number {
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
  if (params.activePlaybackTarget?.kind === 'chapter') {
    const endSeconds = parsePlaybackSeconds(params.activePlaybackTarget.chapter.end_time);
    return endSeconds !== undefined ? endSeconds + 1 : null;
  }

  return null;
}
