import { describe, expect, it } from 'vitest';

import { optionalEnvString } from './optionalEnvString.js';

describe('optionalEnvString', () => {
  it('returns undefined for undefined, empty, and whitespace-only values', () => {
    expect(optionalEnvString(undefined)).toBeUndefined();
    expect(optionalEnvString('')).toBeUndefined();
    expect(optionalEnvString('   ')).toBeUndefined();
  });

  it('returns trimmed non-empty strings', () => {
    expect(optionalEnvString('https://example.com')).toBe('https://example.com');
    expect(optionalEnvString('  podverse  ')).toBe('podverse');
  });
});
