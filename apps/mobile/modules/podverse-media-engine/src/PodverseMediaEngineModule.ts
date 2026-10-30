/**
 * Typed accessor for the native `PodverseMediaEngine` module.
 *
 * This resolves the native module registered by `PodverseMediaEngineModule` (Swift/Kotlin). The RN
 * hook adapter that subscribes to events and maps them to `@podverse/playback-core` policy is
 * separate; this file only exposes the typed native surface.
 *
 * `requireNativeModule` throws if the native module is not linked, so import this only from code that
 * runs on a device/simulator with the module built in (not from pure-JS unit tests).
 */

import { requireNativeModule } from 'expo-modules-core';

import type {
  MediaEngineAudioProfile,
  MediaEngineBasicAuth,
  NativeRawCurrentSource,
  NativeRawPlaybackEvents,
} from './types';

/**
 * Raw native module surface as exposed by the Swift/Kotlin `Module` definition. Note this uses the
 * native **positional** `load(url, initialSeekSeconds?, basicAuth?, audioProfile?, metaJson?)`
 * signature — the higher-level, object-based `NativePlaybackBridge.load(source)` is provided by the
 * JS adapter, which wraps this.
 */
export type PodverseMediaEngineNativeModule = {
  load(
    url: string,
    initialSeekSeconds?: number | null,
    basicAuth?: MediaEngineBasicAuth | null,
    audioProfile?: MediaEngineAudioProfile | null,
    metaJson?: string | null
  ): Promise<void>;
  /** Positional `load` + `play` in one native hop. The adapter wraps the object form. */
  loadAndStart(
    url: string,
    initialSeekSeconds?: number | null,
    basicAuth?: MediaEngineBasicAuth | null,
    audioProfile?: MediaEngineAudioProfile | null,
    metaJson?: string | null
  ): Promise<void>;
  play(): Promise<void>;
  /**
   * Jump to the live point of a live source and play. With a window, seeks to `liveEdgeSeconds`.
   * Without one (progressive stream), reconnects the stream so playback starts at what is live
   * now. Resolves once the seek or reconnect is issued. No-op for a non-live source.
   */
  goToLive(): Promise<void>;
  pause(): void;
  seek(seconds: number): void;
  setRate(rate: number): void;
  getPosition(): Promise<number>;
  getDuration(): Promise<number>;
  getCurrentSource(): Promise<NativeRawCurrentSource | null>;
  destroy(): void;
  /**
   * Positional video-surface attach. The object-based `attachVideoSurface(targetId, rect)`
   * on the JS adapter wraps this; `cornerRadius` is `0` when unspecified.
   */
  attachVideoSurface(
    targetId: string,
    x: number,
    y: number,
    width: number,
    height: number,
    cornerRadius: number
  ): void;
  /** Move the single surface to `toTargetId` over `durationMs`. */
  animateVideoSurface(toTargetId: string, durationMs: number): void;
  /** JS-desired video-surface visibility; gated by native video capability. */
  setVideoSurfaceVisible(visible: boolean): void;
  /**
   * Video fullscreen is on screen. Enables picture-in-picture when the viewer leaves the app and
   * starts physical-orientation samples. Does not move the surface; `animateVideoSurface` does.
   */
  setVideoFullscreen(enabled: boolean): void;
  /** True when the phone itself is sideways, independent of the interface lock. */
  isPhysicalDeviceLandscape(): boolean;
  /** True when the shared surface is showing video frames. */
  isVideoPresented(): boolean;
  writeQueueSnapshotAv(payloadJson: string): Promise<void>;
  writeQueueSnapshotMusic(payloadJson: string): Promise<void>;
  /** Play order after the playing item, for native advance while JS is not running. */
  writeAdvanceWindow(payloadJson: string): Promise<void>;
  writeDownloadsIndex(payloadJson: string): Promise<void>;
  writeLibraryBrowseIndex(payloadJson: string): Promise<void>;
  writeLibraryChildren(channelIdText: string, payloadJson: string): Promise<void>;
  writeHistoryIndex(payloadJson: string): Promise<void>;
  writeLiveIndex(payloadJson: string): Promise<void>;
  writeAccountContext(payloadJson: string): Promise<void>;
  readPlaybackJournal(): Promise<string | null>;
  writePlaybackJournal(payloadJson: string): Promise<void>;
  setJsOwnsAdvance(owns: boolean): Promise<void>;
  addListener<Event extends keyof NativeRawPlaybackEvents>(
    eventName: Event,
    listener: NativeRawPlaybackEvents[Event]
  ): { remove: () => void };
};

let cachedModule: PodverseMediaEngineNativeModule | null = null;

/**
 * Resolve the native module lazily (on first use) rather than at import time, so importing the JS
 * adapter does not throw in contexts where the native module is not linked. `requireNativeModule`
 * throws if the module is missing; call this only on a device/simulator with the module built in.
 */
export function getPodverseMediaEngineModule(): PodverseMediaEngineNativeModule {
  if (cachedModule === null) {
    cachedModule = requireNativeModule<PodverseMediaEngineNativeModule>('PodverseMediaEngine');
  }
  return cachedModule;
}
