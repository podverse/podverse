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

import type { NativeRawPlaybackEvents } from './types';

/**
 * Raw native module surface as exposed by the Swift/Kotlin `Module` definition. Note this uses the
 * native **positional** `load(url, initialSeekSeconds?)` signature — the higher-level, object-based
 * `NativePlaybackBridge.load(source)` is provided by the JS adapter, which wraps this.
 */
export type PodverseMediaEngineNativeModule = {
  load(url: string, initialSeekSeconds?: number): Promise<void>;
  /** Positional `load` + `play` in one native hop. The adapter wraps the object form. */
  loadAndStart(url: string, initialSeekSeconds?: number): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(seconds: number): void;
  setRate(rate: number): void;
  getPosition(): Promise<number>;
  getDuration(): Promise<number>;
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
  writeQueueSnapshot(payloadJson: string): Promise<void>;
  writeDownloadsIndex(payloadJson: string): Promise<void>;
  writeLibraryBrowseIndex(payloadJson: string): Promise<void>;
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
