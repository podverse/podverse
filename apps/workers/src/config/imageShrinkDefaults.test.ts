import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getImageShrinkConfig } from './index.js';

const ENV_KEYS = [
  'IMAGE_SHRINK_WIDTH_PX',
  'IMAGE_SHRINK_FORMAT',
  'IMAGE_SHRINK_JPEG_QUALITY',
  'IMAGE_SHRINK_WEBP_QUALITY',
  'IMAGE_SHRINK_BATCH_SIZE',
  'IMAGE_SHRINK_CONCURRENCY',
  'IMAGE_SHRINK_RPS',
  'IMAGE_SHRINK_MAX_SOURCE_BYTES',
] as const;

describe('getImageShrinkConfig', () => {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    process.env.IMAGE_SHRINK_BATCH_SIZE = '250';
    process.env.IMAGE_SHRINK_CONCURRENCY = '5';
    process.env.IMAGE_SHRINK_RPS = '2';
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const prev = saved[key];
      if (prev === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prev;
      }
    }
  });

  it('uses default width 400, JPEG format, JPEG quality 82, and WebP quality 92 when unset', () => {
    const c = getImageShrinkConfig();
    expect(c.widthPx).toBe(400);
    expect(c.format).toBe('jpeg');
    expect(c.jpegQuality).toBe(82);
    expect(c.webpQuality).toBe(92);
  });

  it('parses explicit width, format, and qualities', () => {
    process.env.IMAGE_SHRINK_WIDTH_PX = '320';
    process.env.IMAGE_SHRINK_FORMAT = ' WebP ';
    process.env.IMAGE_SHRINK_JPEG_QUALITY = '75';
    process.env.IMAGE_SHRINK_WEBP_QUALITY = '85';
    const c = getImageShrinkConfig();
    expect(c.widthPx).toBe(320);
    expect(c.format).toBe('webp');
    expect(c.jpegQuality).toBe(75);
    expect(c.webpQuality).toBe(85);
  });

  it('returns null format for an unsupported value', () => {
    process.env.IMAGE_SHRINK_FORMAT = 'png';
    const c = getImageShrinkConfig();
    expect(c.format).toBeNull();
  });

  it('returns NaN width when set to a non-integer', () => {
    process.env.IMAGE_SHRINK_WIDTH_PX = '400.5';
    const c = getImageShrinkConfig();
    expect(Number.isNaN(c.widthPx)).toBe(true);
  });

  it('returns NaN quality when out of range', () => {
    process.env.IMAGE_SHRINK_JPEG_QUALITY = '0';
    process.env.IMAGE_SHRINK_WEBP_QUALITY = '101';
    const c = getImageShrinkConfig();
    expect(Number.isNaN(c.jpegQuality)).toBe(true);
    expect(Number.isNaN(c.webpQuality)).toBe(true);
  });
});
