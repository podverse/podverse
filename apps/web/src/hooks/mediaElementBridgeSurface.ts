'use client';

import type { RefObject } from 'react';

import { playMediaWhenReady } from '../utils/mediaPlayer/mediaPlayerPlayMediaWhenReady';

export type SyncHttpFileUrlRestoreSeekAndPlayInput = {
  url: string;
  /** When not `null`, set `currentTime` after metadata (or immediately) then call `onRestoreSeekApplied`. */
  persistedSeekToApply: number | null;
  onRestoreSeekApplied: () => void;
  shouldPlay: boolean;
  onPlayedShouldPlayClear: () => void;
};

export type ApplyItemEnclosureSurfaceChangeInput = {
  treatAsActiveNonLiveFile: boolean;
  shouldPlayWhenReady: boolean;
  onPlayedShouldPlayClear: () => void;
};

export function waitForLoadedMetadataOnce(
  media: HTMLMediaElement,
  isCurrent: () => boolean
): Promise<void> {
  return new Promise((resolve) => {
    if (!isCurrent()) {
      resolve();
      return;
    }
    if (media.readyState >= 1) {
      queueMicrotask(() => {
        resolve();
      });
      return;
    }
    const onMeta = () => {
      media.removeEventListener('loadedmetadata', onMeta);
      resolve();
    };
    media.addEventListener('loadedmetadata', onMeta);
  });
}

export function syncHttpFileUrlRestoreSeekAndPlayFromRef(
  mediaRef: RefObject<HTMLMediaElement | null>,
  input: SyncHttpFileUrlRestoreSeekAndPlayInput
): void {
  const media = mediaRef.current;
  if (!media) {
    return;
  }
  if (media.src !== input.url) {
    media.src = input.url;
    media.load();
  }
  const shouldApplyPersisted = input.persistedSeekToApply !== null;
  const seekVal = input.persistedSeekToApply ?? 0;
  const applySeek = () => {
    const el = mediaRef.current;
    if (!el) {
      return;
    }
    if (shouldApplyPersisted) {
      el.currentTime = seekVal;
      input.onRestoreSeekApplied();
    }
  };
  const elNow = mediaRef.current;
  if (!elNow) {
    return;
  }
  if (elNow.readyState >= 1) {
    applySeek();
  } else {
    elNow.addEventListener('loadedmetadata', applySeek, { once: true });
  }
  const elPlay = mediaRef.current;
  if (input.shouldPlay && elPlay) {
    playMediaWhenReady(elPlay, input.onPlayedShouldPlayClear);
  }
}

export function applyItemEnclosureSurfaceChangeFromRef(
  mediaRef: RefObject<HTMLMediaElement | null>,
  input: ApplyItemEnclosureSurfaceChangeInput
): void {
  const media = mediaRef.current;
  if (!media) {
    return;
  }
  if (input.treatAsActiveNonLiveFile) {
    media.currentTime = 0;
    media.load();
    if (input.shouldPlayWhenReady) {
      playMediaWhenReady(media, input.onPlayedShouldPlayClear);
    }
  } else {
    media.pause();
    media.removeAttribute('src');
    media.load();
  }
}
