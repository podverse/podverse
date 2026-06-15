import { describe, expect, it } from 'vitest';

import {
  embedAspectRatioToCssValue,
  embedAspectRatioToPaddingBottomPercent,
} from '../embedAspectRatio';
import { parseEmbedAspectRatio } from '../parseEmbedAspectRatio';

describe('parseEmbedAspectRatio', () => {
  it('returns 16x9 by default', () => {
    expect(parseEmbedAspectRatio(undefined)).toBe('16x9');
    expect(parseEmbedAspectRatio('')).toBe('16x9');
  });

  it('normalizes invalid values to 16x9', () => {
    expect(parseEmbedAspectRatio('not-valid')).toBe('16x9');
  });

  it('preserves valid values', () => {
    expect(parseEmbedAspectRatio('16x9')).toBe('16x9');
    expect(parseEmbedAspectRatio('4x3')).toBe('4x3');
    expect(parseEmbedAspectRatio('1x1')).toBe('1x1');
  });
});

describe('embedAspectRatio helpers', () => {
  it('maps aspect ratio to css value', () => {
    expect(embedAspectRatioToCssValue('16x9')).toBe('16 / 9');
    expect(embedAspectRatioToCssValue('4x3')).toBe('4 / 3');
    expect(embedAspectRatioToCssValue('1x1')).toBe('1 / 1');
  });

  it('maps aspect ratio to padding-bottom percent', () => {
    expect(embedAspectRatioToPaddingBottomPercent('16x9')).toBe(56.25);
    expect(embedAspectRatioToPaddingBottomPercent('4x3')).toBe(75);
    expect(embedAspectRatioToPaddingBottomPercent('1x1')).toBe(100);
  });
});
