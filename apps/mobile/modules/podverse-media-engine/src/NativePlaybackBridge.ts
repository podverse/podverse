/**
 * PG-2b `NativePlaybackBridge` interface (step 2.2 / detail 081).
 *
 * Mirrors the imperative surface of the web `mediaElementBridgeSurface` / `useMediaElementBridge`
 * (load, play, pause, seek, rate, position, duration, destroy) without DOM types. RN code must not
 * call native player APIs outside the adapter that implements this interface (step 2.11) — the same
 * intent as the web ESLint boundary around `useMediaElementBridge`.
 */

import type { MediaEngineSource } from './types';

/** Imperative transport contract. See `../README.md` for per-method args, returns, errors, threading. */
export interface NativePlaybackBridge {
  /** Prepare `source.url` and apply `source.initialSeekSeconds`. Does not start playback. */
  load(source: MediaEngineSource): Promise<void>;
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
}

/**
 * Reserved native-cache write surface (step 2.35 / detail 114). JS mirrors state into native storage
 * so Track 12 (CarPlay / Android Auto) can read queue / downloads / library **without JS running**.
 *
 * PG-2b reserves the signatures only (native persist may be a no-op stub). Payload field lists and
 * durable storage are owned by Track 12.1 (schema) / 12.2–12.3 (storage); JS call sites are 10.22 /
 * 12.4. Native stores opaque snapshots — it does not re-decide queue rules.
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
