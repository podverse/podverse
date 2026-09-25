export type PlaybackSourceMarker = 'local' | 'remote';

let marker: PlaybackSourceMarker | null = null;
const listeners = new Set<() => void>();

export function playbackSourceMarkerFromUrl(url: string | null): PlaybackSourceMarker | null {
  if (url === null || url.length === 0) {
    return null;
  }
  return url.startsWith('file://') ? 'local' : 'remote';
}

/** Remember whether the engine URL is a downloaded file. E2E reads this; product UI does not. */
export function setPlaybackSourceMarker(url: string | null): void {
  const next = playbackSourceMarkerFromUrl(url);
  if (next === marker) {
    return;
  }
  marker = next;
  for (const listener of listeners) {
    listener();
  }
}

export function getPlaybackSourceMarker(): PlaybackSourceMarker | null {
  return marker;
}

export function subscribePlaybackSourceMarker(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
