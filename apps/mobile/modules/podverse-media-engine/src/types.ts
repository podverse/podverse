/**
 * Media-engine shared types.
 *
 * Transport-only. Playback/queue policy stays in `@podverse/playback-core`; this module never
 * re-decides queue rules. Units mirror the web bridge: position and duration are seconds (number).
 */

/** Native playback lifecycle states surfaced to JS via the `playbackState` event. */
export type PlaybackStateValue =
  'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'stalled' | 'ended' | 'error';

/**
 * Input to {@link NativePlaybackBridge.load} and {@link NativePlaybackBridge.loadAndStart}.
 * `initialSeekSeconds` applies after the item is ready.
 */
export type MediaEngineSource = {
  /**
   * Remote enclosure URL, or a local file source for offline playback: a `file://` URL, an
   * absolute filesystem path (iOS), or a `content://` URI (Android). Missing local files fail fast
   * with a `file-not-found` error rather than hanging.
   */
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

/**
 * Stable, cross-platform error taxonomy. Native `code` strings differ per
 * platform (iOS custom codes, Android Media3 `errorCodeName`); `kind` normalizes them so RN can pick
 * an i18n message off a small enum instead of raw native text.
 */
export type PlaybackErrorKind =
  | 'network'
  | 'unsupported'
  | 'file-not-found'
  | 'decode'
  | 'audio-session'
  | 'invalid-source'
  | 'unknown';

/** Raw error payload exactly as emitted by native (stable machine `code` + human `message`). */
export type NativePlaybackErrorPayload = {
  /** Stable native machine code (iOS custom, or Android Media3 `errorCodeName`). */
  code: string;
  message: string;
};

/**
 * Error delivered to RN consumers via `useNativePlaybackBridge`: the raw native fields plus a
 * normalized cross-platform {@link PlaybackErrorKind}. Produced by `normalizePlaybackError`.
 */
export type PlaybackErrorEvent = NativePlaybackErrorPayload & {
  kind: PlaybackErrorKind;
};

export type StalledEvent = {
  positionSeconds: number;
};

/**
 * Named layout targets the single video surface can occupy.
 * There is only ever one surface; these ids select which registered rect it moves to.
 */
export type VideoSurfaceTargetId = 'mini' | 'full';

/**
 * Layout rect for a video surface target, in **density-independent window coordinates** (the same
 * units RN `measureInWindow` returns: iOS points, Android dp). The native module converts to device
 * pixels where needed. A zero-size rect is treated as hidden for that target. `cornerRadius` is
 * applied on iOS; Android surface clipping follows the RN targets.
 */
export type VideoSurfaceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius?: number;
};

/**
 * Event payloads exactly as the native module emits them. The
 * `error` payload here is the **raw** native shape (no `kind`); the JS layer normalizes it.
 * The native module accessor and the transport adapter are typed with this map.
 */
export type NativeRawPlaybackEvents = {
  playbackState: (event: PlaybackStateEvent) => void;
  progress: (event: ProgressEvent) => void;
  ended: (event: EndedEvent) => void;
  error: (event: NativePlaybackErrorPayload) => void;
  stalled: (event: StalledEvent) => void;
};

/**
 * Public event map consumed by RN via `useNativePlaybackBridge`. Identical to
 * {@link NativeRawPlaybackEvents} except `error` carries the normalized {@link PlaybackErrorKind}
 * (the hook runs raw native errors through `normalizePlaybackError`).
 */
export type NativePlaybackEvents = {
  playbackState: (event: PlaybackStateEvent) => void;
  progress: (event: ProgressEvent) => void;
  ended: (event: EndedEvent) => void;
  error: (event: PlaybackErrorEvent) => void;
  stalled: (event: StalledEvent) => void;
};
