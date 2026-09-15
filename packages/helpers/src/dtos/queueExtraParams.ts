import type { PlaybackEventKind } from '../lib/playbackEvents.js';

export type QueueExtraParams = {
  playback_position?: string;
  media_file_duration?: string;
  completed?: boolean;
  last_played_at?: string;
  playback_event_kind?: PlaybackEventKind;
};
