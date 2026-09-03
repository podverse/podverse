/**
 * `NativePlaybackBridge` interface.
 *
 * Mirrors the imperative surface of the web `mediaElementBridgeSurface` / `useMediaElementBridge`
 * (load, play, pause, seek, rate, position, duration, destroy) without DOM types. RN code must not
 * call native player APIs outside the adapter that implements this interface — the same intent as
 * the web ESLint boundary around `useMediaElementBridge`.
 */

import type { MediaEngineSource, VideoSurfaceRect, VideoSurfaceTargetId } from './types';

/** Imperative transport contract. See `../README.md` for per-method args, returns, errors, threading. */
export interface NativePlaybackBridge {
  /** Prepare `source.url` and apply `source.initialSeekSeconds`. Does not start playback. */
  load(source: MediaEngineSource): Promise<void>;
  /**
   * Convenience that combines {@link load} + {@link play} in a single native round-trip: prepare
   * `source.url`, apply `source.initialSeekSeconds`, then start playback.
   * Atomicity: if `play` fails after a successful `load`, the item may still be prepared and the
   * error surfaces via the `error` event. Use {@link load} + {@link play} for prepare-without-play
   * (e.g. cold-start session restore).
   */
  loadAndStart(source: MediaEngineSource): Promise<void>;
  /** Start (or resume) playback of the loaded item. */
  play(): Promise<void>;
  /** Pause playback; keeps the current item and position. */
  pause(): void;
  /** Seek to an absolute position in seconds. */
  seek(seconds: number): void;
  /** Set the playback rate (e.g. `1.0`, `1.5`). */
  setRate(rate: number): void;
  /** Current playhead position in seconds. */
  getPosition(): Promise<number>;
  /** Current item duration in seconds (`0` when unknown/live). */
  getDuration(): Promise<number>;
  /** Tear down the current item/observers. The shared player/session ownership stays native. */
  destroy(): void;
  /**
   * Register or update the layout rect for a video surface target (`mini` / `full`). The native side
   * treats this as a no-op because placement is driven by reparenting the single surface into the
   * RN-mounted `PodverseVideoSurfaceView` for each target. The method and rect serialization remain
   * part of the bridge contract and unit tests. Never loads/destroys the player; visibility is
   * managed separately.
   */
  attachVideoSurface(targetId: VideoSurfaceTargetId, rect: VideoSurfaceRect): void;
  /**
   * Move the single video surface to `toTargetId` over `durationMs`. Never reloads media or resets
   * the playhead; only surface geometry/parenting changes.
   * `durationMs <= 0` snaps without animation; overlapping calls coalesce to the latest target.
   */
  animateVideoSurface(toTargetId: VideoSurfaceTargetId, durationMs: number): void;
  /**
   * JS-desired visibility for the video surface. RN drives this from the playback target kind (video
   * vs audio-only). The surface only actually shows when the current item **also** has video frames
   * (native capability), so a video-medium item playing an audio enclosure never leaves a black
   * rectangle. Never loads/destroys or resets the playhead.
   */
  setVideoSurfaceVisible(visible: boolean): void;
}

/**
 * Reserved native-cache write surface. JS mirrors state into native storage so CarPlay and Android
 * Auto can read queue, downloads, and library **without JS running**.
 *
 * Native stores opaque snapshots — it does not re-decide queue rules.
 */
export interface NativeCacheWriteBridge {
  /** Now-playing + upcoming items for car skip/advance and now-playing. */
  writeQueueSnapshot(payloadJson: string): Promise<void>;
  /** Local `file://` paths + metadata for offline car browse. */
  writeDownloadsIndex(payloadJson: string): Promise<void>;
  /** Podcast/playlist lists for car browse templates. */
  writeLibraryBrowseIndex(payloadJson: string): Promise<void>;
}

/** Full native module surface: playback transport + reserved cache-write hooks. */
export type PodverseMediaEngineBridge = NativePlaybackBridge & NativeCacheWriteBridge;
