/**
 * `podverse-media-engine` — first-party Podverse native media engine (PG-2b, Track 2).
 *
 * Public TypeScript surface only. See `./README.md` for the bridge method/event contract and the
 * reserved native-cache write hooks (step 2.35 / detail 114). Do not use react-native-track-player.
 */

export type {
  NativePlaybackBridge,
  NativeCacheWriteBridge,
  PodverseMediaEngineBridge,
} from './src/NativePlaybackBridge';

export type {
  MediaEngineSource,
  PlaybackStateValue,
  PlaybackStateEvent,
  ProgressEvent,
  EndedEvent,
  PlaybackErrorEvent,
  PlaybackErrorKind,
  NativePlaybackErrorPayload,
  StalledEvent,
  NativePlaybackEvents,
  NativeRawPlaybackEvents,
  VideoSurfaceTargetId,
  VideoSurfaceRect,
} from './src/types';

export { mapPlaybackErrorKind, normalizePlaybackError } from './src/playbackErrorTaxonomy';

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
