/**
 * `podverse-media-engine` — first-party Podverse native media engine.
 *
 * Public TypeScript surface only. See `./README.md` for the bridge method/event contract and the
 * reserved native-cache write hooks. Do not use react-native-track-player.
 */

export type {
  NativePlaybackBridge,
  NativeCacheWriteBridge,
  PodverseMediaEngineBridge,
} from './src/NativePlaybackBridge';

export type {
  MediaEngineAudioProfile,
  MediaEngineBasicAuth,
  MediaEngineCurrentSource,
  MediaEngineLiveWindow,
  MediaEngineSource,
  MediaEngineSourceMeta,
  MediaEngineSourceOrigin,
  PlaybackStateValue,
  PlaybackStateEvent,
  ProgressEvent,
  NativeRawCurrentSource,
  NativeRawProgressEvent,
  EndedEvent,
  PlaybackErrorEvent,
  PlaybackErrorKind,
  NativePlaybackErrorPayload,
  RemoteTrackCommandEvent,
  SourceChangedEvent,
  StalledEvent,
  NativePlaybackEvents,
  NativeRawPlaybackEvents,
  VideoSurfaceTargetId,
  VideoSurfaceRect,
} from './src/types';

export { mapPlaybackErrorKind, normalizePlaybackError } from './src/playbackErrorTaxonomy';
export {
  normalizeCurrentSource,
  normalizeLiveWindow,
  normalizeProgressEvent,
} from './src/liveWindowNormalization';

export {
  serializeAnimateVideoSurfaceCommand,
  serializeAttachVideoSurfaceCommand,
  serializeLoadCommand,
} from './src/bridgeCommandSerialization';
export type {
  AnimateVideoSurfaceCommandArgs,
  AttachVideoSurfaceCommandArgs,
  LoadCommandArgs,
} from './src/bridgeCommandSerialization';

export type { PodverseMediaEngineNativeModule } from './src/PodverseMediaEngineModule';

export { PodverseVideoSurfaceView } from './src/PodverseVideoSurfaceView';
export type { PodverseVideoSurfaceViewProps } from './src/PodverseVideoSurfaceView';
