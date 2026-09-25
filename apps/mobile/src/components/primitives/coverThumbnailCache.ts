/**
 * Bounded least-recently-used store of decoded cover thumbnails, keyed by pixel edge and URI. The
 * bound is decoded bytes, so a few large grid tiles and many small row covers share one budget.
 * Concurrent requests for one key share a single load, and a failed load is not remembered, so the
 * next mount retries. Entries are dropped, never released: a mounted image may still be showing a
 * thumbnail after it leaves the store.
 */

/** About 24 MB of decoded pixels: roughly 190 row covers or 50 grid tiles on a 3x screen. */
export const COVER_THUMBNAIL_CACHE_BYTES = 24 * 1024 * 1024;

/**
 * Exact device pixels for a point edge. Pair with a UIImage tagged at the screen scale so the
 * layer draws 1:1 and does not minify the bitmap again.
 */
export function thumbnailEdgePx(edgePoints: number, pixelRatio: number): number {
  return Math.max(1, Math.round(edgePoints * pixelRatio));
}

/** Decoded size of a square thumbnail at four bytes per pixel. */
export function thumbnailBytes(edgePx: number): number {
  return edgePx * edgePx * 4;
}

/** Animated GIFs keep the plain expo-image path; a thumbnail decode would keep one frame. */
export function isThumbnailEligibleUri(uri: string): boolean {
  return !/\.gif($|[?#])/i.test(uri);
}

export type ThumbnailCache<T> = {
  bytes(): number;
  get(uri: string, edgePx: number): T | null;
  load(uri: string, edgePx: number): Promise<T>;
  size(): number;
};

type CachedThumbnail<T> = { bytes: number; value: T };

export function createThumbnailCache<T>(
  loadThumbnail: (uri: string, edgePx: number) => Promise<T>,
  maxBytes: number = COVER_THUMBNAIL_CACHE_BYTES
): ThumbnailCache<T> {
  const ready = new Map<string, CachedThumbnail<T>>();
  const pending = new Map<string, Promise<T>>();
  let usedBytes = 0;
  const keyFor = (uri: string, edgePx: number): string => `${edgePx}|${uri}`;

  return {
    bytes() {
      return usedBytes;
    },
    get(uri, edgePx) {
      const key = keyFor(uri, edgePx);
      const entry = ready.get(key);
      if (entry === undefined) {
        return null;
      }
      ready.delete(key);
      ready.set(key, entry);
      return entry.value;
    },
    load(uri, edgePx) {
      const key = keyFor(uri, edgePx);
      const entry = ready.get(key);
      if (entry !== undefined) {
        return Promise.resolve(entry.value);
      }
      const inFlight = pending.get(key);
      if (inFlight !== undefined) {
        return inFlight;
      }
      const request = loadThumbnail(uri, edgePx).then(
        (loaded) => {
          pending.delete(key);
          const bytes = thumbnailBytes(edgePx);
          ready.set(key, { bytes, value: loaded });
          usedBytes += bytes;
          // The newest entry always stays, even when it alone is over the budget.
          for (const [oldestKey, oldest] of ready) {
            if (usedBytes <= maxBytes || oldestKey === key) {
              break;
            }
            ready.delete(oldestKey);
            usedBytes -= oldest.bytes;
          }
          return loaded;
        },
        (error: unknown) => {
          pending.delete(key);
          throw error;
        }
      );
      pending.set(key, request);
      return request;
    },
    size() {
      return ready.size;
    },
  };
}
