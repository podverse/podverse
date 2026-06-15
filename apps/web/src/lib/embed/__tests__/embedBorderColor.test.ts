import { describe, expect, it } from 'vitest';

import {
  buildEmbedBorderStyleValue,
  DEFAULT_EMBED_BORDER_COLOR,
  EMBED_BORDER_COLOR_PRESET_VALUES,
  resolveEmbedBorderPresetKey,
  sanitizeEmbedBorderColor,
} from '../embedBorderColor';

describe('embedBorderColor', () => {
  it('defaults to darker gray', () => {
    expect(DEFAULT_EMBED_BORDER_COLOR).toBe('#444444');
    expect(EMBED_BORDER_COLOR_PRESET_VALUES['darker-gray']).toBe('#444444');
  });

  describe('buildEmbedBorderStyleValue', () => {
    it('builds a 1px solid border for a color', () => {
      expect(buildEmbedBorderStyleValue('#000000')).toBe('1px solid #000000');
      expect(buildEmbedBorderStyleValue('rgb(10, 20, 30)')).toBe('1px solid rgb(10, 20, 30)');
    });

    it('returns null for none and empty values', () => {
      expect(buildEmbedBorderStyleValue('none')).toBeNull();
      expect(buildEmbedBorderStyleValue('NONE')).toBeNull();
      expect(buildEmbedBorderStyleValue('   ')).toBeNull();
    });
  });

  describe('sanitizeEmbedBorderColor', () => {
    it('keeps safe color strings', () => {
      expect(sanitizeEmbedBorderColor('  #abc123 ')).toBe('#abc123');
      expect(sanitizeEmbedBorderColor('rgba(0,0,0,0.5)')).toBe('rgba(0,0,0,0.5)');
      expect(sanitizeEmbedBorderColor('none')).toBe('none');
      expect(sanitizeEmbedBorderColor('')).toBe('');
    });

    it('falls back to the default for values that could break the style attribute', () => {
      expect(sanitizeEmbedBorderColor('red;"></iframe><script>')).toBe(DEFAULT_EMBED_BORDER_COLOR);
      expect(sanitizeEmbedBorderColor('a'.repeat(100))).toBe(DEFAULT_EMBED_BORDER_COLOR);
    });
  });

  describe('resolveEmbedBorderPresetKey', () => {
    it('matches preset colors case-insensitively', () => {
      expect(resolveEmbedBorderPresetKey('#444444')).toBe('darker-gray');
      expect(resolveEmbedBorderPresetKey('#FFFFFF')).toBe('white');
      expect(resolveEmbedBorderPresetKey('none')).toBe('none');
    });

    it('returns null for custom colors', () => {
      expect(resolveEmbedBorderPresetKey('#123456')).toBeNull();
      expect(resolveEmbedBorderPresetKey('')).toBeNull();
    });
  });
});
