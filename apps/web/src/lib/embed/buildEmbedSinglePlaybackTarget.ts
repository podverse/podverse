import type { PlaybackTarget } from '../playback';
import { playbackTargetFromStandardLoad } from '../playback';
import type { EmbedSingleResourcePayload } from './fetchEmbedSingleResource';

export function buildEmbedSinglePlaybackTarget(
  resource: EmbedSingleResourcePayload
): PlaybackTarget {
  return playbackTargetFromStandardLoad({
    channel: resource.channel,
    clip: resource.clip,
    item: resource.item,
    itemChapter: resource.itemChapter,
    itemSoundbite: resource.itemSoundbite,
    musicIntent: 'explicit_play',
  });
}
