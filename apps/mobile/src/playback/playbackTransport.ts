import type { PlaybackStateValue } from '../../modules/podverse-media-engine';

/**
 * What the mini player and full-player transport button show.
 *
 * List rows and episode/podcast detail play controls stay play/pause only — loading and error
 * belong on this chrome so those lists do not re-render a spinner per row.
 */
export type PlaybackTransportState = 'error' | 'loading' | 'paused' | 'playing';

/** Engine states that mean "waiting on bytes" rather than a settled transport position. */
export const isEngineBufferingState = (state: PlaybackStateValue): boolean => {
  return state === 'loading' || state === 'stalled';
};

/** Engine states that prove the current source has enough media to start playing. */
export const isEnginePlayableState = (state: PlaybackStateValue): boolean => {
  return state === 'ended' || state === 'paused' || state === 'playing' || state === 'ready';
};

/**
 * Transport glyph for an engine state, or `null` when the state must not change the glyph.
 *
 * The spinner means "this source cannot start yet". Once the engine has reported the source
 * playable, later buffering keeps the play/pause mark: there is already enough media to play, and a
 * spinner appearing on every re-buffer would flicker over the control the listener is aiming at.
 */
export const playbackTransportForEngineState = (
  state: PlaybackStateValue,
  sourcePlayable: boolean
): PlaybackTransportState | null => {
  if (state === 'error') {
    return 'error';
  }
  if (isEngineBufferingState(state)) {
    return sourcePlayable ? null : 'loading';
  }
  if (state === 'playing') {
    return 'playing';
  }
  if (state === 'idle') {
    return null;
  }
  return 'paused';
};
