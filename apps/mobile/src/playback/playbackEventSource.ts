import type { PlaybackEventKind } from '@podverse/helpers/playbackEvents';
import type { PlaybackTarget } from '@podverse/playback-core';

export type PlaybackDiscreteSignal =
  | 'complete'
  | 'pause'
  | 'play'
  | 'queue_add'
  | 'queue_remove'
  | 'queue_reorder'
  | 'seek'
  | 'skip'
  | 'sleep_timer_stop';

export type PlaybackNowPlayingResource = {
  resourceIdText: string;
  resourceKind: 'clip' | 'item' | 'soundbite';
};

const IMMEDIATE_NOW_PLAYING_EVENT_KINDS: readonly PlaybackEventKind[] = [
  'complete',
  'pause',
  'play',
  'seek',
  'skip',
  'sleep_timer_stop',
];

export const playbackEventFromDiscreteSignal = (
  signal: PlaybackDiscreteSignal
): PlaybackEventKind => signal;

export const playbackEventFromProgressSample = ({
  isPlaying,
}: {
  isPlaying: boolean;
}): PlaybackEventKind | null => {
  return isPlaying ? 'progress_tick' : null;
};

export const playbackEventFromBackgroundTransition = ({
  isPlaying,
}: {
  isPlaying: boolean;
}): PlaybackEventKind | null => {
  return isPlaying ? 'progress_tick' : null;
};

export const shouldPostNowPlayingImmediately = (kind: PlaybackEventKind): boolean => {
  return IMMEDIATE_NOW_PLAYING_EVENT_KINDS.some((immediateKind) => immediateKind === kind);
};

export const shouldClaimActiveQueueForPlaybackEvent = (kind: PlaybackEventKind): boolean => {
  return kind === 'play';
};

export const nowPlayingResourceFromTarget = (
  target: PlaybackTarget
): PlaybackNowPlayingResource | null => {
  switch (target.kind) {
    case 'clip':
      return { resourceIdText: target.clip.id_text, resourceKind: 'clip' };
    case 'soundbite':
      return { resourceIdText: target.soundbite.id_text, resourceKind: 'soundbite' };
    case 'chapter':
    case 'item-music':
    case 'item-podcast':
    case 'item-video':
      return { resourceIdText: target.item.id_text, resourceKind: 'item' };
    case 'add-by-rss':
    case 'livestream':
      return null;
  }
};
