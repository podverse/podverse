/**
 * `NativePlaybackBridge` interface.
 *
 * Mirrors the imperative surface of the web `mediaElementBridgeSurface` / `useMediaElementBridge`
 * (load, play, goToLive, pause, seek, rate, position, duration, destroy) without DOM types. RN
 * code must not call native player APIs outside the adapter that implements this interface — the
 * same intent as the web ESLint boundary around `useMediaElementBridge`.
 */

import type {
  MediaEngineCurrentSource,
  MediaEngineSource,
  VideoSurfaceRect,
  VideoSurfaceTargetId,
} from './types';

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
  /**
   * Start or resume playback. A fresh paused load just starts. After the item has played, a live
   * source resumes in place only at or after the window start plus 6 seconds; otherwise it jumps
   * to live and plays.
   */
  play(): Promise<void>;
  /**
   * Jump to the live point of a live source and play. With a window, seeks to `liveEdgeSeconds`.
   * Without one (progressive stream), reconnects the stream so playback starts at what is live
   * now. Resolves once the seek or reconnect is issued. No-op for a non-live source.
   */
  goToLive(): Promise<void>;
  /** Pause playback; keeps the current item and position. */
  pause(): void;
  /**
   * Seek to an absolute position in seconds. On a live source, clamps into the window, or does
   * nothing when the stream holds no window.
   */
  seek(seconds: number): void;
  /** Set the playback rate (e.g. `1.0`, `1.5`). */
  setRate(rate: number): void;
  /** Current playhead position in seconds. */
  getPosition(): Promise<number>;
  /** Duration in seconds. `0` when unknown, and always `0` while a live source is loaded. */
  getDuration(): Promise<number>;
  /**
   * Loaded source, position, and live window, or `null` when nothing is loaded. `durationSeconds`
   * is `0` while a live source is loaded. This is the fresh window while paused.
   */
  getCurrentSource(): Promise<MediaEngineCurrentSource | null>;
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
  /**
   * Video fullscreen is on screen. The native host may start picture-in-picture when the app
   * backgrounds, and it samples the phone's physical orientation. The surface move itself is
   * {@link animateVideoSurface} with target `fullscreen`.
   */
  setVideoFullscreen(enabled: boolean): void;
  /** True when the phone itself is sideways, independent of the interface lock. */
  isPhysicalDeviceLandscape(): boolean;
  /** True when the shared surface is showing video frames. */
  isVideoPresented(): boolean;
}

/**
 * Reserved native-cache write surface. JS mirrors state into native storage so CarPlay and Android
 * Auto can read queue, downloads, and library **without JS running**.
 *
 * Native stores opaque snapshots — it does not re-decide queue rules.
 */
export interface NativeCacheWriteBridge {
  /** Now-playing + upcoming for the podcast and video queue. */
  writeQueueSnapshotAv(payloadJson: string): Promise<void>;
  /** Now-playing + upcoming for the music queue. */
  writeQueueSnapshotMusic(payloadJson: string): Promise<void>;
  /** Play order after the playing item, for native advance while JS is not running. */
  writeAdvanceWindow(payloadJson: string): Promise<void>;
  /** Local `file://` paths + metadata for offline car browse. */
  writeDownloadsIndex(payloadJson: string): Promise<void>;
  /** Podcast/playlist lists for car browse templates. */
  writeLibraryBrowseIndex(payloadJson: string): Promise<void>;
  writeLibraryChildren(channelIdText: string, payloadJson: string): Promise<void>;
  writeHistoryIndex(payloadJson: string): Promise<void>;
  writeLiveIndex(payloadJson: string): Promise<void>;
  /** Signed-in flag + accountIdText for journal attribution. */
  writeAccountContext(payloadJson: string): Promise<void>;
  /** Read the durable playback journal JSON (or null when absent). */
  readPlaybackJournal(): Promise<string | null>;
  /** Replace the journal payload after a successful drain. */
  writePlaybackJournal(payloadJson: string): Promise<void>;
  /**
   * When true, JS owns queue advance on ended; native must not auto-advance. Native also takes
   * advance back when the module that installed the event sink goes away.
   */
  setJsOwnsAdvance(owns: boolean): Promise<void>;
}

/** Full native module surface: playback transport + reserved cache-write hooks. */
export type PodverseMediaEngineBridge = NativePlaybackBridge & NativeCacheWriteBridge;
