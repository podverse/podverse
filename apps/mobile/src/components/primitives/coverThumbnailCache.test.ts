import { describe, expect, it, vi } from 'vitest';

import {
  createThumbnailCache,
  isThumbnailEligibleUri,
  thumbnailBytes,
  thumbnailEdgePx,
} from './coverThumbnailCache';

describe('thumbnailEdgePx', () => {
  it('returns the exact device pixels for the displayed edge', () => {
    expect(thumbnailEdgePx(60, 3)).toBe(180);
    expect(thumbnailEdgePx(60, 2)).toBe(120);
    expect(thumbnailEdgePx(115, 3)).toBe(345);
    expect(thumbnailEdgePx(0.2, 1)).toBe(1);
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
