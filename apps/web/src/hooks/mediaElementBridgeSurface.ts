'use client';

import type { RefObject } from 'react';

import { HLS_PLAYLIST_MIME_TYPE, isHlsSource } from '@podverse/helpers';

import { playMediaWhenReady } from '../utils/mediaPlayer/mediaPlayerPlayMediaWhenReady';

type ManagedHlsPlayback = {
  src: string;
  destroy: () => void;
};

const managedHlsPlayback = new WeakMap<HTMLMediaElement, ManagedHlsPlayback>();
const hlsAttachGeneration = new WeakMap<HTMLMediaElement, number>();

/** Safari reports `maybe` or `probably` for an HLS playlist MIME. Other browsers report an empty string. */
export function elementSupportsNativeHls(media: HTMLMediaElement): boolean {
  const result = media.canPlayType(HLS_PLAYLIST_MIME_TYPE);
  return result === 'probably' || result === 'maybe';
}

export function hasManagedNonLiveHls(media: HTMLMediaElement): boolean {
  return managedHlsPlayback.has(media);
}

function destroyManagedHls(media: HTMLMediaElement): void {
  const managed = managedHlsPlayback.get(media);
  if (managed === undefined) {
    return;
  }
  managedHlsPlayback.delete(media);
  managed.destroy();
}

/** Drop an HLS playlist attachment so a later file source can own the element. */
export function detachNonLiveHlsPlayback(media: HTMLMediaElement): void {
  hlsAttachGeneration.set(media, (hlsAttachGeneration.get(media) ?? 0) + 1);
  destroyManagedHls(media);
}

/**
 * Play an HLS playlist on this element. Native HLS sets `src`. Other browsers lazy-load `hls.js`
 * and leave `src` unset so the browser does not try to decode the HLS playlist itself.
 */
export async function attachNonLiveHlsPlayback(
  media: HTMLMediaElement,
  src: string
): Promise<void> {
  const existing = managedHlsPlayback.get(media);
  if (existing !== undefined && existing.src === src) {
    return;
  }

  const generation = (hlsAttachGeneration.get(media) ?? 0) + 1;
  hlsAttachGeneration.set(media, generation);
  destroyManagedHls(media);

  if (elementSupportsNativeHls(media)) {
    if (media.src !== src) {
      media.src = src;
      media.load();
    }
    return;
  }

  media.removeAttribute('src');
  let HlsCtor: {
    isSupported: () => boolean;
    new (): {
      loadSource: (url: string) => void;
      attachMedia: (element: HTMLMediaElement) => void;
      destroy: () => void;
    };
  };
  try {
    const imported = await import('hls.js');
    HlsCtor = imported.default;
  } catch {
    if (hlsAttachGeneration.get(media) !== generation) {
      return;
    }
    media.src = src;
    media.load();
    return;
  }
  if (hlsAttachGeneration.get(media) !== generation) {
    return;
  }
  if (!HlsCtor.isSupported()) {
    media.src = src;
    media.load();
    return;
  }

  const hls = new HlsCtor();
  managedHlsPlayback.set(media, {
    src,
    destroy: () => {
      hls.destroy();
    },
  });
  hls.loadSource(src);
  hls.attachMedia(media);
}

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
  /** The HLS playlist attachment owns `load`. A file reload here would interrupt it. */
  hlsPlaylistAttachment?: boolean;
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
  if (isHlsSource(input.url)) {
    void attachNonLiveHlsPlayback(media, input.url);
  } else {
    detachNonLiveHlsPlayback(media);
    if (media.src !== input.url) {
      media.src = input.url;
      media.load();
    }
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
    if (input.hlsPlaylistAttachment !== true && !hasManagedNonLiveHls(media)) {
      media.load();
    }
    if (input.shouldPlayWhenReady) {
      playMediaWhenReady(media, input.onPlayedShouldPlayClear);
    }
  } else {
    detachNonLiveHlsPlayback(media);
    media.pause();
    media.removeAttribute('src');
    media.load();
  }
}
