import { describe, expect, it } from 'vitest';

import { personNameKey } from './nameKey.js';

describe('personNameKey', () => {
  it('hyphenates a display name and drops punctuation', () => {
    expect(personNameKey('  Dave Jones  ')).toBe('dave-jones');
    expect(personNameKey('Dave   Jones')).toBe('dave-jones');
    expect(personNameKey('Ada Lovelace, PhD')).toBe('ada-lovelace-phd');
  });

  it('returns null when nothing identifying remains', () => {
    expect(personNameKey('   ')).toBeNull();
    expect(personNameKey('---')).toBeNull();
  });

  it('keeps letters and numbers from other scripts', () => {
    expect(personNameKey('José Muñoz')).toBe('josé-muñoz');
    expect(personNameKey('Host 2')).toBe('host-2');
  });
});
