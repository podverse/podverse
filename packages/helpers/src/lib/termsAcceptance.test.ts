import { describe, expect, it } from 'vitest';

import { isCurrentTermsAccepted } from './termsAcceptance.js';

describe('isCurrentTermsAccepted', () => {
  it('treats a blank configured version as already satisfied', () => {
    expect(isCurrentTermsAccepted(null, '')).toBe(true);
  });

  it('requires a matching stored version', () => {
    expect(isCurrentTermsAccepted(null, '2026-01-01')).toBe(false);
    expect(isCurrentTermsAccepted({ terms_version: '2025-01-01' }, '2026-01-01')).toBe(false);
    expect(isCurrentTermsAccepted({ terms_version: '2026-01-01' }, '2026-01-01')).toBe(true);
  });
});
