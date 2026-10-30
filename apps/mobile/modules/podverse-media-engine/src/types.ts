/**
 * Media-engine shared types.
 *
 * Transport-only. Playback/queue policy stays in `@podverse/playback-core`; this module never
 * re-decides queue rules. Units mirror the web bridge: position and duration are seconds (number).
 */

/** Native playback lifecycle states surfaced to JS via the `playbackState` event. */
export type PlaybackStateValue =
  'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'stalled' | 'ended' | 'error';

/** Who initiated the load — car browse vs phone JS. */
export type MediaEngineSourceOrigin = 'js' | 'car';

/** Identity + now-playing fields carried with every car load and preferred for phone loads. */
export type MediaEngineSourceMeta = {
  idText: string;
  kind: 'item' | 'clip' | 'item_soundbite' | 'add_by_rss' | 'livestream';
  queueMedium: 'av' | 'music';
  title: string;
  subtitle?: string | null;
  /**
   * OS album field. Set only when `subtitle` holds artist names; otherwise the channel title is
   * in `subtitle` and this is null.
   */
  albumTitle?: string | null;
  artworkUrl?: string | null;
  isLive?: boolean;
  clipStartSeconds?: number | null;
  clipEndSeconds?: number | null;
  origin: MediaEngineSourceOrigin;
};

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
  /**
   * Basic Auth for a protected add-by-RSS feed. Native answers a host's 401 challenge with these
   * credentials only when the challenging host is inside the scope; it never puts them in the URL
   * or on a request up front, so a redirect to another host cannot carry them.
   */
  basicAuth?: MediaEngineBasicAuth;
  /**
   * How the OS should treat this audio when something else needs the speaker. Omitted keeps the
   * profile the engine last applied.
   */
  audioProfile?: MediaEngineAudioProfile;
  /** Item identity and now-playing metadata. Car paths always pass this; phone JS should too. */
  meta?: MediaEngineSourceMeta;
};

/**
 * The part of a live stream the native player can still play, in the same timeline as
 * `positionSeconds`. The timeline is the player's own: it can start above zero, and both ends move
 * forward while the stream runs. Compare fields only within one event or one snapshot.
 */
export type MediaEngineLiveWindow = {
  /** Earliest position the stream still holds. */
  startSeconds: number;
  /**
   * Where `goToLive` lands: the newest position the player will play, after the stream's own
   * hold-back. A listener at the live point reads `positionSeconds` within a few seconds of this.
   */
  liveEdgeSeconds: number;
};

/**
 * `getCurrentSource()` exactly as native returns it. Live fields are present only when native
 * sends them.
 */
export type NativeRawCurrentSource = {
  url: string;
  meta: MediaEngineSourceMeta | null;
  positionSeconds: number;
  durationSeconds: number;
  /** Play intent: playing, buffering toward play, or waiting on a start seek. */
  isPlaying?: boolean;
  isLive?: boolean;
  liveWindow?: MediaEngineLiveWindow | null;
};

/** Snapshot returned by {@link NativePlaybackBridge.getCurrentSource}. */
export type MediaEngineCurrentSource = {
  url: string;
  meta: MediaEngineSourceMeta | null;
  positionSeconds: number;
  /**
   * Seconds; `0` when unknown, and always `0` while a live source is loaded.
   */
  durationSeconds: number;
  /** Play intent: playing, buffering toward play, or waiting on a start seek. */
  isPlaying?: boolean;
  /** The loaded source's meta marked it live. */
  isLive: boolean;
  /** Seekable span of a live source; `null` when not live or the stream holds no history. */
  liveWindow: MediaEngineLiveWindow | null;
};

/** Emitted when a load replaces the engine's current source. */
export type SourceChangedEvent = {
  url: string;
  meta: MediaEngineSourceMeta | null;
};

/**
 * Audio behavior per medium, applied on every load:
 *
 * - `spoken` — podcasts, audiobooks. A navigation prompt or other spoken audio pauses playback,
 *   which resumes afterwards (iOS `.spokenAudio`, Android `AUDIO_CONTENT_TYPE_SPEECH`).
 * - `music` — a navigation prompt lowers the volume instead of pausing (iOS `.default`, Android
 *   `AUDIO_CONTENT_TYPE_MUSIC`).
 * - `video` — movie playback (iOS `.moviePlayback`, Android `AUDIO_CONTENT_TYPE_MOVIE`).
 */
export type MediaEngineAudioProfile = 'spoken' | 'music' | 'video';

/**
 * Credentials plus the hosts they may be answered to.
 *
 * `scopeMatch: 'domain'` accepts `scopeHost` and any subdomain of it; `'exact'` (IP literals,
 * `localhost`) accepts only `scopeHost`. Challenges over plain http are refused unless
 * `allowInsecure` is set (dev / E2E test-assets only).
 */
export type MediaEngineBasicAuth = {
  username: string;
  password: string;
  scopeHost: string;
  scopeMatch: 'domain' | 'exact';
  allowInsecure: boolean;
};

export type PlaybackStateEvent = {
  state: PlaybackStateValue;
};

/** `progress` exactly as native emits it. Live fields are present only when native sends them. */
export type NativeRawProgressEvent = {
  positionSeconds: number;
  durationSeconds: number;
  isLive?: boolean;
  liveWindow?: MediaEngineLiveWindow | null;
};

/** `progress` as RN consumers receive it from `useNativePlaybackBridge`. */
export type ProgressEvent = {
  positionSeconds: number;
  /** Seconds; `0` when unknown, and always `0` while a live source is loaded. */
  durationSeconds: number;
  /** The loaded source's meta marked it live. */
  isLive: boolean;
  /** Seekable span of a live source; `null` when not live or the stream holds no history. */
  liveWindow: MediaEngineLiveWindow | null;
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
  | 'host-http'
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
  /**
   * Underlying cause as the platform reported it (exception class and message on Android; NSError
   * domain, code, and the item error-log comment on iOS). Present only when native found one.
   */
  detail?: string;
  /**
   * HTTP status the media host answered with, when the failure was a bad response. This is the
   * creator's server, not Podverse, which is what makes it worth showing to support.
   */
  httpStatus?: number;
  message: string;
  /** The URL the engine was requesting when it failed. May differ from the source after redirects. */
  url?: string;
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
 * A Music track skip from the car, a headset, or the lock screen that the phone's queue should
 * decide. Native sends it only while JS owns advance, and has already restarted the track when
 * previous arrives more than a few seconds in.
 */
export type RemoteTrackCommandEvent = {
  command: 'next' | 'previous';
};

/**
 * Named layout targets the single video surface can occupy.
 * There is only ever one surface; these ids select which registered rect it moves to.
 */
export type VideoSurfaceTargetId = 'mini' | 'full' | 'fullscreen';

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
 * Event payloads exactly as the native module emits them. `error` is the raw native shape (no
 * `kind`) and `progress` may omit live fields. The native module accessor and the transport
 * adapter are typed with this map.
 */
export type NativeRawPlaybackEvents = {
  playbackState: (event: PlaybackStateEvent) => void;
  progress: (event: NativeRawProgressEvent) => void;
  ended: (event: EndedEvent) => void;
  error: (event: NativePlaybackErrorPayload) => void;
  stalled: (event: StalledEvent) => void;
  sourceChanged: (event: SourceChangedEvent) => void;
  remoteTrackCommand: (event: RemoteTrackCommandEvent) => void;
  /** iOS only: the CarPlay scene connected. Background car sync listens for it. */
  podverseCarPlayDidConnect: () => void;
  /** The shared surface is showing video frames. */
  videoPresented: (event: VideoPresentedEvent) => void;
  /** Physical device attitude while video fullscreen is active. Flat orientations are omitted. */
  deviceOrientation: (event: DeviceOrientationEvent) => void;
  /** System picture-in-picture window. `restore` is true when the viewer tapped the window to return. */
  pictureInPicture: (event: PictureInPictureEvent) => void;
};

export type VideoPresentedEvent = {
  presented: boolean;
};

export type DeviceOrientationEvent = {
  landscape: boolean;
};

export type PictureInPictureEvent = {
  active: boolean;
  restore: boolean;
};

/**
 * Public event map consumed by RN via `useNativePlaybackBridge`. `error` carries the normalized
 * {@link PlaybackErrorKind} and `progress` carries the normalized live fields. The hook runs raw
 * native payloads through `normalizePlaybackError` and `normalizeProgressEvent`.
 */
export type NativePlaybackEvents = {
  playbackState: (event: PlaybackStateEvent) => void;
  progress: (event: ProgressEvent) => void;
  ended: (event: EndedEvent) => void;
  error: (event: PlaybackErrorEvent) => void;
  stalled: (event: StalledEvent) => void;
  sourceChanged: (event: SourceChangedEvent) => void;
};
