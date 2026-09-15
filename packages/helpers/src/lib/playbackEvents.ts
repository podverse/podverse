export const PLAYBACK_EVENT_KINDS = [
  'play',
  'pause',
  'seek',
  'progress_tick',
  'complete',
  'skip',
  'sleep_timer_stop',
  'queue_add',
  'queue_remove',
  'queue_reorder',
] as const;

export type PlaybackEventKind = (typeof PLAYBACK_EVENT_KINDS)[number];

export type PlaybackEventMeaningContext = {
  isPlaying?: boolean;
};

export type PlaybackZone = 'history' | 'now_playing' | 'upcoming' | 'removed';

/**
 * These names are documentation only, not event kinds.
 *
 * They must never be converted into `PlaybackEventKind` values and filtered later. The absence of
 * an event in these cases is what keeps playback ordering tied to when audio advanced or a user
 * acted, rather than to passive app lifecycle activity.
 */
export const PLAYBACK_NON_EVENTS = [
  'app_open',
  'server_hydration',
  'render',
  'background_refresh',
] as const;

export const isMeaningfulPlaybackEvent = (
  kind: PlaybackEventKind,
  context: PlaybackEventMeaningContext
): boolean => {
  if (kind === 'progress_tick') {
    return context.isPlaying === true;
  }

  return true;
};

export const resolveZoneForEvent = (kind: PlaybackEventKind): PlaybackZone => {
  switch (kind) {
    case 'play':
    case 'pause':
    case 'seek':
    case 'progress_tick':
    case 'sleep_timer_stop':
      return 'now_playing';
    case 'complete':
    case 'skip':
      return 'history';
    case 'queue_add':
    case 'queue_reorder':
      return 'upcoming';
    case 'queue_remove':
      return 'removed';
  }
};
