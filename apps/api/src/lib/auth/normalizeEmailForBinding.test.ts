import { describe, expect, it } from 'vitest';

import { normalizeEmailForBinding } from './normalizeEmailForBinding.js';

describe('normalizeEmailForBinding', () => {
  it('trims outer whitespace and lowercases email', () => {
    expect(normalizeEmailForBinding('  SOME.User+Tag@Example.COM  ')).toBe(
      'some.user+tag@example.com'
    );
  });

  it('keeps internal spaces unchanged while normalizing case', () => {
    expect(normalizeEmailForBinding('FIRST LAST@Example.COM')).toBe('first last@example.com');
  });
});
