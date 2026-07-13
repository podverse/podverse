/**
 * Typed accessor for the native `PodverseMediaEngine` module (step 2.1 scaffold).
 *
 * This resolves the native module registered by `PodverseMediaEngineModule` (Swift/Kotlin). The RN
 * hook adapter that subscribes to events and maps them to `@podverse/playback-core` policy lands in
 * step 2.11 (detail 090) — this file only exposes the typed native surface.
 *
 * `requireNativeModule` throws if the native module is not linked, so import this only from code that
 * runs on a device/simulator with the module built in (not from pure-JS unit tests).
 */

import { requireNativeModule } from 'expo-modules-core';

import type { NativePlaybackEvents } from './types';

/**
 * Raw native module surface as exposed by the Swift/Kotlin `Module` definition. Note this uses the
 * native **positional** `load(url, initialSeekSeconds?)` signature — the higher-level, object-based
 * `NativePlaybackBridge.load(source)` is provided by the JS adapter (step 2.11), which wraps this.
 */
export type PodverseMediaEngineNativeModule = {
  load(url: string, initialSeekSeconds?: number): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(seconds: number): void;
  setRate(rate: number): void;
  getPosition(): Promise<number>;
  getDuration(): Promise<number>;
  destroy(): void;
  writeQueueSnapshot(payloadJson: string): Promise<void>;
  writeDownloadsIndex(payloadJson: string): Promise<void>;
  writeLibraryBrowseIndex(payloadJson: string): Promise<void>;
  addListener<Event extends keyof NativePlaybackEvents>(
    eventName: Event,
    listener: NativePlaybackEvents[Event]
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
