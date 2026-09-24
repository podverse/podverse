# 05a — Byte-capped cache for decoded cover thumbnails (pure code, no UI change)

## Goal

On iOS, expo-image keeps each full-size original in memory and scales it down **on the main
thread** every time a cell shows it (`ImageView.imageLoadCompleted` → `processImage` → `resize`).
A chip switch mounts 10–20 cells in one commit, so the main thread stalls; memory reached 784 MB
(peak 1.08 GB). 05b switches iOS list and grid artwork to thumbnails decoded off the main thread.
This milestone adds the store those thumbnails live in, with no UI change yet:

- Least-recently-used, bounded by **decoded bytes** (about 24 MB), so covers still paint
  instantly when rows reappear while scrolling, and memory stays bounded however many covers a
  session shows.
- Concurrent requests for one cover share one decode; a failed decode is not remembered.
- Animated GIFs are not eligible (05b keeps them on today's path so they still animate).

**Prediction:** none; there is no capture. The unit test is the checkpoint.

## Preconditions

- 03c done and baselines B1, B2 captured.

## Files

- New: `apps/mobile/src/components/primitives/coverThumbnailCache.ts`
- New: `apps/mobile/src/components/primitives/coverThumbnailCache.test.ts`
- `apps/mobile/vitest.config.ts`

## Step 1 — `coverThumbnailCache.ts` (new, pure: no imports)

```ts
/**
 * Bounded least-recently-used store of decoded cover thumbnails, keyed by pixel edge and URI. The
 * bound is decoded bytes, so a few large grid tiles and many small row covers share one budget.
 * Concurrent requests for one key share a single load, and a failed load is not remembered, so the
 * next mount retries. Entries are dropped, never released: a mounted image may still be showing a
 * thumbnail after it leaves the store.
 */

/** About 24 MB of decoded pixels: roughly 170 row covers or 40 grid tiles on a 3x screen. */
export const COVER_THUMBNAIL_CACHE_BYTES = 24 * 1024 * 1024;
export const COVER_THUMBNAIL_EDGE_STEP_PX = 64;

/** Pixel edge for a point edge, rounded up to a shared step so nearby sizes reuse one decode. */
export function thumbnailEdgePx(edgePoints: number, pixelRatio: number): number {
  const steps = Math.ceil((edgePoints * pixelRatio) / COVER_THUMBNAIL_EDGE_STEP_PX);
  return Math.max(1, steps) * COVER_THUMBNAIL_EDGE_STEP_PX;
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
```

## Step 2 — `coverThumbnailCache.test.ts` (new)

```ts
import { describe, expect, it, vi } from 'vitest';

import {
  createThumbnailCache,
  isThumbnailEligibleUri,
  thumbnailBytes,
  thumbnailEdgePx,
} from './coverThumbnailCache';

describe('thumbnailEdgePx', () => {
  it('rounds the pixel edge up to the shared step', () => {
    expect(thumbnailEdgePx(60, 3)).toBe(192);
    expect(thumbnailEdgePx(60, 2)).toBe(128);
    expect(thumbnailEdgePx(115, 3)).toBe(384);
    expect(thumbnailEdgePx(0.5, 1)).toBe(64);
  });
});

describe('isThumbnailEligibleUri', () => {
  it('keeps animated GIFs on the plain path', () => {
    expect(isThumbnailEligibleUri('https://cdn.example/cover.GIF')).toBe(false);
    expect(isThumbnailEligibleUri('https://cdn.example/cover.gif?w=600')).toBe(false);
    expect(isThumbnailEligibleUri('https://cdn.example/cover.gif#frame')).toBe(false);
    expect(isThumbnailEligibleUri('https://cdn.example/cover.png')).toBe(true);
    expect(isThumbnailEligibleUri('https://cdn.example/gifts/cover.jpg')).toBe(true);
  });
});

describe('createThumbnailCache', () => {
  it('shares one load between concurrent requests, then serves it synchronously', async () => {
    const load = vi.fn(async (uri: string, edgePx: number) => `${uri}@${edgePx}`);
    const cache = createThumbnailCache(load);
    expect(cache.get('a', 192)).toBeNull();
    const [first, second] = await Promise.all([cache.load('a', 192), cache.load('a', 192)]);
    expect(first).toBe('a@192');
    expect(second).toBe('a@192');
    expect(load).toHaveBeenCalledTimes(1);
    expect(cache.get('a', 192)).toBe('a@192');
    await cache.load('a', 384);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('drops the least recently used entries past the byte budget', async () => {
    const cache = createThumbnailCache(async (uri: string) => uri, thumbnailBytes(64) * 2);
    await cache.load('a', 64);
    await cache.load('b', 64);
    cache.get('a', 64);
    await cache.load('c', 64);
    expect(cache.size()).toBe(2);
    expect(cache.bytes()).toBe(thumbnailBytes(64) * 2);
    expect(cache.get('b', 64)).toBeNull();
    expect(cache.get('a', 64)).toBe('a');
    expect(cache.get('c', 64)).toBe('c');
  });

  it('keeps the newest entry even when it alone is over the budget', async () => {
    const cache = createThumbnailCache(async (uri: string) => uri, thumbnailBytes(64));
    await cache.load('a', 64);
    await cache.load('b', 128);
    expect(cache.size()).toBe(1);
    expect(cache.get('a', 64)).toBeNull();
    expect(cache.get('b', 128)).toBe('b');
    expect(cache.bytes()).toBe(thumbnailBytes(128));
  });

  it('does not remember a failed load', async () => {
    let attempts = 0;
    const cache = createThumbnailCache(async (uri: string) => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('network');
      }
      return uri;
    });
    await expect(cache.load('a', 64)).rejects.toThrow('network');
    expect(cache.get('a', 64)).toBeNull();
    await expect(cache.load('a', 64)).resolves.toBe('a');
    expect(attempts).toBe(2);
  });
});
```

## Step 3 — vitest include

In `apps/mobile/vitest.config.ts`, directly after the line
`      'src/components/primitives/FillList.test.ts',` add
`      'src/components/primitives/coverThumbnailCache.test.ts',`.

## Step 4 — Format

```bash
./scripts/nix/with-env npx prettier --write apps/mobile/src/components/primitives/coverThumbnailCache.ts apps/mobile/src/components/primitives/coverThumbnailCache.test.ts apps/mobile/vitest.config.ts
```

## Do not

- Do not add imports to `coverThumbnailCache.ts`; it stays pure so the unit test needs no mocks.
- Do not change the byte budget or the GIF rule; 05b and the report assume them.

## Done when

- [ ] Steps 1–4 done. COPY-PASTA 05a ticked; this file moved to
      `.llm/plans/completed/mobile-chip-switch-smooth/`.

## Keep / revert

Nothing to measure. If 05b is reverted, delete these two files and the vitest line too.

## Operator checkpoint

**Mobile**:

```bash
npm --prefix apps/mobile run test -- src/components/primitives
```

Reply `done 05a` with the result, then paste prompt 05b.
