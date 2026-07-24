/**
 * JS `NativePlaybackBridge` adapter (master step 2.11 / detail 090).
 *
 * This is the ONLY place RN talks to the native `podverse-media-engine` module. Screens and hooks
 * must go through this adapter (or `useNativePlaybackBridge`) — never import the native module
 * directly. This parallels the ESLint boundary around web's `useMediaElementBridge`.
 *
 * Playback/queue policy stays in `@podverse/playback-core`; this adapter is transport only. Future
 * controls will call playback-core to compute a decision, then call this adapter.
 */

import type {
  MediaEngineSource,
  NativeCacheWriteBridge,
  NativePlaybackBridge,
  NativeRawPlaybackEvents,
  VideoSurfaceRect,
  VideoSurfaceTargetId,
} from '../../modules/podverse-media-engine';
import {
  serializeAnimateVideoSurfaceCommand,
  serializeAttachVideoSurfaceCommand,
  serializeLoadCommand,
} from '../../modules/podverse-media-engine';
import { getPodverseMediaEngineModule } from '../../modules/podverse-media-engine/src/PodverseMediaEngineModule';

export type PlaybackEventSubscription = { remove: () => void };

/**
 * High-level bridge = transport (`NativePlaybackBridge`) + reserved cache writes + event subscribe.
 *
 * `addListener` delivers **raw** native events (the `error` payload has no normalized `kind`); the
 * `useNativePlaybackBridge` hook is the sanctioned consumer path and runs errors through
 * `normalizePlaybackError` (2.27). Direct `addListener('error', …)` callers can normalize themselves.
 */
export type PodversePlaybackBridge = NativePlaybackBridge &
  NativeCacheWriteBridge & {
    addListener<Event extends keyof NativeRawPlaybackEvents>(
      event: Event,
      listener: NativeRawPlaybackEvents[Event]
    ): PlaybackEventSubscription;
  };

class NativePlaybackBridgeAdapter implements PodversePlaybackBridge {
  async load(source: MediaEngineSource): Promise<void> {
    await getPodverseMediaEngineModule().load(...serializeLoadCommand(source));
  }

  async loadAndStart(source: MediaEngineSource): Promise<void> {
    await getPodverseMediaEngineModule().loadAndStart(...serializeLoadCommand(source));
  }

  async play(): Promise<void> {
    await getPodverseMediaEngineModule().play();
  }

  pause(): void {
    getPodverseMediaEngineModule().pause();
  }

  seek(seconds: number): void {
    getPodverseMediaEngineModule().seek(seconds);
  }

  setRate(rate: number): void {
    getPodverseMediaEngineModule().setRate(rate);
  }

  getPosition(): Promise<number> {
    return getPodverseMediaEngineModule().getPosition();
  }

  getDuration(): Promise<number> {
    return getPodverseMediaEngineModule().getDuration();
  }

  destroy(): void {
    getPodverseMediaEngineModule().destroy();
  }

  attachVideoSurface(targetId: VideoSurfaceTargetId, rect: VideoSurfaceRect): void {
    getPodverseMediaEngineModule().attachVideoSurface(
      ...serializeAttachVideoSurfaceCommand(targetId, rect)
    );
  }

  animateVideoSurface(toTargetId: VideoSurfaceTargetId, durationMs: number): void {
    getPodverseMediaEngineModule().animateVideoSurface(
      ...serializeAnimateVideoSurfaceCommand(toTargetId, durationMs)
    );
  }

  setVideoSurfaceVisible(visible: boolean): void {
    getPodverseMediaEngineModule().setVideoSurfaceVisible(visible);
  }

  writeQueueSnapshot(payloadJson: string): Promise<void> {
    return getPodverseMediaEngineModule().writeQueueSnapshot(payloadJson);
  }

  writeDownloadsIndex(payloadJson: string): Promise<void> {
    return getPodverseMediaEngineModule().writeDownloadsIndex(payloadJson);
  }

  writeLibraryBrowseIndex(payloadJson: string): Promise<void> {
    return getPodverseMediaEngineModule().writeLibraryBrowseIndex(payloadJson);
  }

  addListener<Event extends keyof NativeRawPlaybackEvents>(
    event: Event,
    listener: NativeRawPlaybackEvents[Event]
  ): PlaybackEventSubscription {
    return getPodverseMediaEngineModule().addListener(event, listener);
  }
}

/** Process-wide singleton adapter over the single native engine. */
export const nativePlaybackBridge: PodversePlaybackBridge = new NativePlaybackBridgeAdapter();
