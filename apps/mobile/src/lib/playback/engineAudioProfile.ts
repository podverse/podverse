import { MediumEnum } from '@podverse/helpers/medium';
import type { PlaybackTarget } from '@podverse/playback-core';

import type { MediaEngineAudioProfile } from '../../../modules/podverse-media-engine';

const MUSIC_MEDIUMS: ReadonlySet<number> = new Set([
  MediumEnum.Music,
  MediumEnum.MusicL,
  MediumEnum.PublisherMusic,
]);

const VIDEO_MEDIUMS: ReadonlySet<number> = new Set([
  MediumEnum.Video,
  MediumEnum.VideoL,
  MediumEnum.Film,
  MediumEnum.FilmL,
  MediumEnum.PublisherVideo,
  MediumEnum.PublisherFilm,
]);

/**
 * How the OS should treat this target's audio when a call, navigation prompt, or another app
 * needs the speaker. Clips, chapters, and soundbites follow their channel's medium. Anything
 * without a channel (add-by-RSS) is treated as spoken, since that is what most feeds carry.
 */
export function resolveEngineAudioProfile(target: PlaybackTarget | null): MediaEngineAudioProfile {
  if (target === null || target.kind === 'add-by-rss') {
    return 'spoken';
  }
  if (target.kind === 'item-music') {
    return 'music';
  }
  if (target.kind === 'item-video') {
    return 'video';
  }
  const mediumId = target.channel.medium_id;
  if (MUSIC_MEDIUMS.has(mediumId)) {
    return 'music';
  }
  if (VIDEO_MEDIUMS.has(mediumId)) {
    return 'video';
  }
  return 'spoken';
}
