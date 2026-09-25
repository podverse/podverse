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
 * The spinner means "this source cannot start yet". A start-play load (`pendingStart`) owns the
 * glyph itself: spinner until the load is issued, pause once the engine accepts the source.
 * `ready`, `paused`, `loading`, `stalled`, `idle`, and `ended` during that load are startup beats
 * and must not move the glyph. `playing` confirms pause, and `error` is the only failure glyph.
 * Once the source is playable, later buffering keeps the current glyph.
 */
export const playbackTransportForEngineState = (
  state: PlaybackStateValue,
  sourcePlayable: boolean,
  pendingStart = false
): PlaybackTransportState | null => {
  if (state === 'error') {
    return 'error';
  }
  if (state === 'playing') {
    return 'playing';
  }
  // A start-play load owns the glyph: spinner until the load is issued, pause once it is.
  // ready / paused / stalled / loading / idle during startup are beats, not a transport change.
  if (pendingStart) {
    return null;
  }
  if (isEngineBufferingState(state)) {
    return sourcePlayable ? null : 'loading';
  }
  if (state === 'idle') {
    return null;
  }
  return 'paused';
};
