import { describe, expect, it } from 'vitest';

import { isMobileRefreshJwtPayload } from './auth.js';

describe('isMobileRefreshJwtPayload', () => {
  it('accepts a refresh payload with a positive integer id', () => {
    expect(
      isMobileRefreshJwtPayload({
        id: 12,
        id_text: 'abc',
        token_use: 'refresh',
      })
    ).toBe(true);
  });

  it('rejects access tokens and malformed payloads', () => {
    expect(
      isMobileRefreshJwtPayload({
        id: 12,
        id_text: 'abc',
        token_use: 'access',
      })
    ).toBe(false);
    expect(isMobileRefreshJwtPayload({ id: 12, token_use: 'refresh' })).toBe(false);
    expect(isMobileRefreshJwtPayload({ id: '12', id_text: 'abc', token_use: 'refresh' })).toBe(
      false
    );
    expect(isMobileRefreshJwtPayload('refresh')).toBe(false);
  });
});
