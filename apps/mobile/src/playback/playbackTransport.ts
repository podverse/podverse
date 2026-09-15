import type { PlaybackStateValue } from '../../modules/podverse-media-engine';

/**
 * What the mini player and full-player transport button show.
 *
 * List rows and episode/podcast detail play controls stay play/pause only — loading and error
 * belong on this chrome so those lists do not re-render a spinner per row.
 */
export type PlaybackTransportState = 'error' | 'loading' | 'paused' | 'playing';

export const playbackTransportFromEngineState = (
  state: PlaybackStateValue
): PlaybackTransportState => {
  switch (state) {
    case 'loading':
    case 'stalled':
      return 'loading';
    case 'error':
      return 'error';
    case 'playing':
      return 'playing';
    case 'ended':
    case 'idle':
    case 'paused':
    case 'ready':
      return 'paused';
  }
};
