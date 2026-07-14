/**
 * PG-2b media-engine shared types (step 2.2 / detail 081).
 *
 * Transport-only. Playback/queue policy stays in `@podverse/playback-core`; this module never
 * re-decides queue rules. Units mirror the web bridge: position and duration are seconds (number).
 */

/** Native playback lifecycle states surfaced to JS via the `playbackState` event. */
export type PlaybackStateValue =
  'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'stalled' | 'ended' | 'error';

/** Input to {@link NativePlaybackBridge.load}. `initialSeekSeconds` applies after the item is ready. */
export type MediaEngineSource = {
  /** Remote enclosure URL, or a local `file://` path (offline playback lands in 2.26). */
  url: string;
  /** Seconds to seek to once the item is ready. Omit or `0` to start at the beginning. */
  initialSeekSeconds?: number;
};

export type PlaybackStateEvent = {
  state: PlaybackStateValue;
};

export type ProgressEvent = {
  positionSeconds: number;
  durationSeconds: number;
};

/** Emitted when the current item plays to its natural end. */
export type EndedEvent = {
  positionSeconds: number;
};

export type PlaybackErrorEvent = {
  /** Stable machine code (mapped to `@podverse/helpers` playback errors in 2.27). */
  code: string;
  message: string;
};

export type StalledEvent = {
  positionSeconds: number;
};

/**
 * Native → JS event map (aligns with step 2.10 / detail 089). The JS adapter (step 2.11) subscribes
 * to these; the raw hooks are intentionally not wired into RN screens in PG-2b.
 */
export type NativePlaybackEvents = {
  playbackState: (event: PlaybackStateEvent) => void;
  progress: (event: ProgressEvent) => void;
  ended: (event: EndedEvent) => void;
  error: (event: PlaybackErrorEvent) => void;
  stalled: (event: StalledEvent) => void;
};
