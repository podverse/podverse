import { describe, expect, it } from 'vitest';

import { formatFileSize } from './fileSize.js';

describe('formatFileSize', () => {
  it('returns null for null, undefined, negative, or zero without zeroLabel', () => {
    expect(formatFileSize(null)).toBeNull();
    expect(formatFileSize(undefined)).toBeNull();
    expect(formatFileSize(-1)).toBeNull();
    expect(formatFileSize(0)).toBeNull();
  });

  it('returns zeroLabel when bytes is 0 and zeroLabel is set', () => {
    expect(formatFileSize(0, { zeroLabel: '0 B' })).toBe('0 B');
  });

  it('formats bytes below 1 KB', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('formats KB with one decimal when under 10', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('rounds KB when value is at least 10', () => {
    expect(formatFileSize(10240)).toBe('10 KB');
  });

  it('formats MB', () => {
    expect(formatFileSize(5_242_880)).toBe('5 MB');
  });

  it('formats GB', () => {
    expect(formatFileSize(3_221_225_472)).toBe('3 GB');
  });

  it('formats TB', () => {
    const oneTb = 1024 ** 4;
    expect(formatFileSize(oneTb * 2)).toBe('2 TB');
    expect(formatFileSize(Math.floor(oneTb * 1.5))).toBe('1.5 TB');
  });
});
