import type { DTOClip, DTOItemChapter, DTOItemSoundbite } from '@podverse/helpers';

import { parsePlaybackSeconds } from './parsePlaybackSeconds.js';
import type { PlaybackLoadDecision } from './resolvePlaybackLoadDecision.js';

export type ResolveEnclosureSwitchPlaybackDecisionParams = {
  resumeAtSeconds: number;
  mpClip: DTOClip | null;
  mpItemSoundbite: DTOItemSoundbite | null;
  mpItemChapter: DTOItemChapter | null;
};

function resolveEnclosureSwitchPauseAtSeconds({
  mpClip,
  mpItemSoundbite,
  mpItemChapter,
}: Pick<
  ResolveEnclosureSwitchPlaybackDecisionParams,
  'mpClip' | 'mpItemSoundbite' | 'mpItemChapter'
>): number | undefined {
  if (mpClip !== null) {
    const clipEndSeconds = parsePlaybackSeconds(mpClip.end_time);
    return clipEndSeconds !== undefined ? clipEndSeconds + 1 : undefined;
  }

  if (mpItemSoundbite !== null) {
    const startSeconds = parsePlaybackSeconds(mpItemSoundbite.start_time) ?? 0;
    const durationSeconds = parsePlaybackSeconds(mpItemSoundbite.duration) ?? 0;
    return startSeconds + durationSeconds + 1;
  }

  if (mpItemChapter !== null) {
    const chapterEndSeconds = parsePlaybackSeconds(mpItemChapter.end_time);
    return chapterEndSeconds !== undefined ? chapterEndSeconds + 1 : undefined;
  }

  return undefined;
}

export function resolveEnclosureSwitchPlaybackDecision({
  resumeAtSeconds,
  mpClip,
  mpItemSoundbite,
  mpItemChapter,
}: ResolveEnclosureSwitchPlaybackDecisionParams): PlaybackLoadDecision {
  const initialSeekSeconds = parsePlaybackSeconds(resumeAtSeconds) ?? 0;

  return {
    initialSeekSeconds,
    pauseAtSeconds: resolveEnclosureSwitchPauseAtSeconds({
      mpClip,
      mpItemSoundbite,
      mpItemChapter,
    }),
    reason: 'enclosure-switch-resume',
    shouldAutoPlay: false,
    shouldClearAutoQueue: false,
    shouldRecordPlaybackStat: false,
  };
}
