/**
 * JS `NativePlaybackBridge` adapter.
 *
 * This is the ONLY place RN talks to the native `podverse-media-engine` module. Screens and hooks
 * must go through this adapter (or `useNativePlaybackBridge`) — never import the native module
 * directly. This parallels the ESLint boundary around web's `useMediaElementBridge`.
 *
 * Playback/queue policy stays in `@podverse/playback-core`; this adapter is transport only. Controls
 * call playback-core to compute a decision, then call this adapter.
 */

import type {
  MediaEngineCurrentSource,
  MediaEngineSource,
  NativeCacheWriteBridge,
  NativePlaybackBridge,
  NativeRawPlaybackEvents,
  VideoSurfaceRect,
  VideoSurfaceTargetId,
} from '../../modules/podverse-media-engine';
import {
  normalizeCurrentSource,
  serializeAnimateVideoSurfaceCommand,
  serializeAttachVideoSurfaceCommand,
  serializeLoadCommand,
} from '../../modules/podverse-media-engine';
import { getPodverseMediaEngineModule } from '../../modules/podverse-media-engine/src/PodverseMediaEngineModule';

export type PlaybackEventSubscription = { remove: () => void };

/**
 * High-level bridge = transport (`NativePlaybackBridge`) + reserved cache writes + event subscribe.
 *
 * `addListener` delivers raw native events (`progress` may omit live fields; `error` has no
 * `kind`). `useNativePlaybackBridge` normalizes both. `getCurrentSource()` is normalized here.
 * Direct `addListener` callers can normalize themselves.
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

  goToLive(): Promise<void> {
    return getPodverseMediaEngineModule().goToLive();
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

  async getCurrentSource(): Promise<MediaEngineCurrentSource | null> {
    const raw = await getPodverseMediaEngineModule().getCurrentSource();
    return normalizeCurrentSource(raw);
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

  setVideoFullscreen(enabled: boolean): void {
    getPodverseMediaEngineModule().setVideoFullscreen(enabled);
  }

  isPhysicalDeviceLandscape(): boolean {
    return getPodverseMediaEngineModule().isPhysicalDeviceLandscape();
  }

  isVideoPresented(): boolean {
    return getPodverseMediaEngineModule().isVideoPresented();
  }

  writeQueueSnapshotAv(payloadJson: string): Promise<void> {
    return getPodverseMediaEngineModule().writeQueueSnapshotAv(payloadJson);
  }

  writeQueueSnapshotMusic(payloadJson: string): Promise<void> {
    return getPodverseMediaEngineModule().writeQueueSnapshotMusic(payloadJson);
  }

  writeAdvanceWindow(payloadJson: string): Promise<void> {
    return getPodverseMediaEngineModule().writeAdvanceWindow(payloadJson);
  }

  writeDownloadsIndex(payloadJson: string): Promise<void> {
    return getPodverseMediaEngineModule().writeDownloadsIndex(payloadJson);
  }

  writeLibraryBrowseIndex(payloadJson: string): Promise<void> {
    return getPodverseMediaEngineModule().writeLibraryBrowseIndex(payloadJson);
  }

  writeLibraryChildren(channelIdText: string, payloadJson: string): Promise<void> {
    return getPodverseMediaEngineModule().writeLibraryChildren(channelIdText, payloadJson);
  }

  writeHistoryIndex(payloadJson: string): Promise<void> {
    return getPodverseMediaEngineModule().writeHistoryIndex(payloadJson);
  }

  writeLiveIndex(payloadJson: string): Promise<void> {
    return getPodverseMediaEngineModule().writeLiveIndex(payloadJson);
  }

  writeAccountContext(payloadJson: string): Promise<void> {
    return getPodverseMediaEngineModule().writeAccountContext(payloadJson);
  }

  readPlaybackJournal(): Promise<string | null> {
    return getPodverseMediaEngineModule().readPlaybackJournal();
  }

  writePlaybackJournal(payloadJson: string): Promise<void> {
    return getPodverseMediaEngineModule().writePlaybackJournal(payloadJson);
  }

  setJsOwnsAdvance(owns: boolean): Promise<void> {
    return getPodverseMediaEngineModule().setJsOwnsAdvance(owns);
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
