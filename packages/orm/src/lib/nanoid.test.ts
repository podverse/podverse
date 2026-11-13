import { describe, expect, it } from 'vitest';

import { assignIdText, generateRandomIdText, isValidNanoIdV2IdText } from './nanoid.js';

describe('nano_id_v2 length', () => {
  it('accepts 7 and 15 characters, including a hyphen and an underscore', () => {
    expect(isValidNanoIdV2IdText('eFv5NFx')).toBe(true);
    expect(isValidNanoIdV2IdText('g_lAQnsaL')).toBe(true);
    expect(isValidNanoIdV2IdText('abcdefghijklmno')).toBe(true);
    expect(isValidNanoIdV2IdText('abc-def')).toBe(true);
  });

  it('rejects 6 and 16 characters', () => {
    expect(isValidNanoIdV2IdText('abcdef')).toBe(false);
    expect(isValidNanoIdV2IdText('abcdefghijklmnop')).toBe(false);
  });

  it('generates a 10-character id', () => {
    expect(generateRandomIdText()).toHaveLength(10);
  });

  it('keeps a provided id and replaces one that is empty or too short', () => {
    expect(assignIdText('eFv5NFx')).toBe('eFv5NFx');
    expect(assignIdText('g_lAQnsaL')).toBe('g_lAQnsaL');
    expect(assignIdText('')).toHaveLength(10);
    expect(assignIdText('abcdef')).toHaveLength(10);
    expect(assignIdText(null)).toHaveLength(10);
    expect(assignIdText(undefined)).toHaveLength(10);
  });
});
