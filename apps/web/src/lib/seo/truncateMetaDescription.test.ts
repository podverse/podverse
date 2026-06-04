import { describe, expect, it } from 'vitest';

import { truncateMetaDescription } from './truncateMetaDescription';

describe('truncateMetaDescription', () => {
  it('returns empty string for missing input', () => {
    expect(truncateMetaDescription('')).toBe('');
    expect(truncateMetaDescription('   ')).toBe('');
  });

  it('returns text unchanged when below max length', () => {
    expect(truncateMetaDescription('Podverse rocks')).toBe('Podverse rocks');
  });

  it('truncates at a word boundary when possible', () => {
    const text =
      'A very long metadata description that should stop at a clean boundary for readability.';
    expect(truncateMetaDescription(text, 52)).toBe(
      'A very long metadata description that should stop at'
    );
  });

  it('falls back to hard cutoff when no word boundary exists', () => {
    expect(truncateMetaDescription('x'.repeat(200), 10)).toBe('x'.repeat(10));
  });
});
